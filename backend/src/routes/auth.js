import { z } from 'zod';
import { nanoid } from 'nanoid';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

/**
 * Verify a Stellar wallet signature
 * Freighter signs messages using the account's ed25519 keypair
 */
function verifySignature(walletAddress, message, signedMessage) {
  try {
    // Decode the public key from the Stellar address (G...)
    const publicKeyBytes = StellarSdk.StrKey.decodeEd25519PublicKey(walletAddress);
    
    // The signed message from Freighter is base64 encoded
    const signatureBytes = Buffer.from(signedMessage, 'base64');
    
    // Message should be the raw string that was signed
    const messageBytes = Buffer.from(message, 'utf8');
    
    // Create a Keypair from the public key for verification
    const keypair = StellarSdk.Keypair.fromPublicKey(walletAddress);
    
    // Verify the signature
    return keypair.verify(messageBytes, signatureBytes);
  } catch (err) {
    console.error('Signature verification error:', err.message);
    return false;
  }
}

// Validation schemas
const walletAuthSchema = z.object({
  walletAddress: z.string().length(56),
  signedMessage: z.string().optional(),
  message: z.string().optional(),
});

const registerSchema = z.object({
  walletAddress: z.string().length(56),
  role: z.enum(['subscriber', 'creator']).default('subscriber'),
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
});

export default async function authRoutes(fastify, options) {
  const { db } = fastify;
  
  /**
   * GET /api/auth/nonce/:walletAddress
   * Get a nonce for wallet signature authentication
   */
  fastify.get('/nonce/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params;
    
    // Validate wallet address format
    if (!/^G[A-Z0-9]{55}$/.test(walletAddress)) {
      return reply.code(400).send({ error: 'Invalid wallet address format' });
    }
    
    // Generate a new nonce
    const nonce = nanoid(32);
    const message = `Sign this message to authenticate with Orbit.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
    
    // Store or update nonce for this wallet
    let user = await db.users.findByWallet(walletAddress);
    
    if (user) {
      await db.query(
        'UPDATE users SET nonce = $1 WHERE wallet_address = $2',
        [nonce, walletAddress]
      );
    } else {
      // Create a temporary record with just the nonce
      await db.query(
        `INSERT INTO users (wallet_address, nonce, created_at) 
         VALUES ($1, $2, NOW())
         ON CONFLICT (wallet_address) DO UPDATE SET nonce = $2`,
        [walletAddress, nonce]
      );
    }
    
    return { nonce, message };
  });
  
  /**
   * POST /api/auth/verify
   * Verify wallet signature and return JWT
   */
  fastify.post('/verify', async (request, reply) => {
    const data = walletAuthSchema.parse(request.body);
    const { walletAddress, signedMessage, message } = data;
    
    // Get user with nonce
    const user = await db.users.findByWallet(walletAddress);
    
    if (!user) {
      return reply.code(400).send({ error: 'User not found. Request a nonce first.' });
    }
    
    // Verify the signature
    // In development, signature verification is optional for easier testing
    const requireSignature = process.env.REQUIRE_SIGNATURE === 'true' || 
                             process.env.NODE_ENV === 'production';
    
    if (requireSignature) {
      if (!signedMessage || !message) {
        return reply.code(400).send({ error: 'Signature and message required' });
      }
      
      // Verify the nonce is in the message to prevent replay attacks
      if (!message.includes(user.nonce)) {
        return reply.code(401).send({ error: 'Invalid nonce in message' });
      }
      
      // Verify the signature
      const isValid = verifySignature(walletAddress, message, signedMessage);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid signature' });
      }
    }
    
    // Clear nonce (one-time use)
    await db.query(
      'UPDATE users SET nonce = NULL WHERE wallet_address = $1',
      [walletAddress]
    );
    
    // Generate JWT
    const token = fastify.jwt.sign({
      id: user.id,
      walletAddress: user.wallet_address,
      role: user.role,
    });
    
    return {
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        role: user.role,
        displayName: user.display_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
    };
  });
  
  /**
   * POST /api/auth/register
   * Register a new user with wallet
   */
  fastify.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);
    
    // Check if user exists
    let user = await db.users.findByWallet(data.walletAddress);
    
    if (user && user.role) {
      return reply.code(409).send({ error: 'User already registered' });
    }
    
    // Start transaction
    const result = await db.transaction(async (client) => {
      // Create or update user
      let userId;
      
      if (user) {
        // Update existing placeholder user
        const updateResult = await client.query(
          `UPDATE users 
           SET role = $2, display_name = $3, bio = $4, updated_at = NOW()
           WHERE wallet_address = $1
           RETURNING *`,
          [data.walletAddress, data.role, data.displayName, data.bio]
        );
        user = updateResult.rows[0];
        userId = user.id;
      } else {
        // Create new user
        const createResult = await client.query(
          `INSERT INTO users (wallet_address, role, display_name, bio, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING *`,
          [data.walletAddress, data.role, data.displayName, data.bio]
        );
        user = createResult.rows[0];
        userId = user.id;
      }
      
      // If creator, also create creator record
      let creator = null;
      if (data.role === 'creator') {
        const creatorResult = await client.query(
          `INSERT INTO creators (user_id, category, created_at)
           VALUES ($1, $2, NOW())
           RETURNING *`,
          [userId, data.category || 'general']
        );
        creator = creatorResult.rows[0];
      }
      
      return { user, creator };
    });
    
    // Generate JWT
    const token = fastify.jwt.sign({
      id: result.user.id,
      walletAddress: result.user.wallet_address,
      role: result.user.role,
    });
    
    return {
      token,
      user: {
        id: result.user.id,
        walletAddress: result.user.wallet_address,
        role: result.user.role,
        displayName: result.user.display_name,
        bio: result.user.bio,
        avatarUrl: result.user.avatar_url,
        createdAt: result.user.created_at,
      },
      creator: result.creator,
    };
  });
  
  /**
   * GET /api/auth/me
   * Get current user info
   */
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await db.users.findById(request.user.id);
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    let creator = null;
    if (user.role === 'creator') {
      const creatorResult = await db.query(
        'SELECT * FROM creators WHERE user_id = $1',
        [user.id]
      );
      creator = creatorResult.rows[0] || null;
    }
    
    return {
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        role: user.role,
        displayName: user.display_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        email: user.email,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      },
      creator,
    };
  });
  
  /**
   * POST /api/auth/logout
   * Invalidate session (for refresh tokens in future)
   */
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    // In a full implementation, invalidate refresh token here
    return { success: true };
  });
}
