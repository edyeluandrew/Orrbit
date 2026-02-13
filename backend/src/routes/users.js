import { z } from 'zod';

const updateUserSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  email: z.string().email().optional(),
});

export default async function userRoutes(fastify, options) {
  const { db } = fastify;
  
  /**
   * GET /api/users/:walletAddress
   * Get user by wallet address (public)
   */
  fastify.get('/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params;
    
    const user = await db.users.findByWallet(walletAddress);
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    // Return public profile only
    return {
      id: user.id,
      walletAddress: user.wallet_address,
      role: user.role,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    };
  });
  
  /**
   * PATCH /api/users/me
   * Update current user's profile
   */
  fastify.patch('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = updateUserSchema.parse(request.body);
    
    const user = await db.users.update(request.user.id, data);
    
    return {
      id: user.id,
      walletAddress: user.wallet_address,
      role: user.role,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      email: user.email,
      emailVerified: user.email_verified,
      updatedAt: user.updated_at,
    };
  });
  
  /**
   * GET /api/users/me/subscriptions
   * Get current user's subscriptions
   */
  fastify.get('/me/subscriptions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const subscriptions = await db.subscriptions.findByUser(request.user.id);
    
    return { subscriptions };
  });
  
  /**
   * GET /api/users/me/transactions
   * Get current user's transactions
   */
  fastify.get('/me/transactions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { limit = 50, offset = 0 } = request.query;
    
    const transactions = await db.transactions.findByUser(request.user.id, {
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
    });
    
    return { transactions };
  });
  
  /**
   * GET /api/users/me/notifications
   * Get current user's notifications
   */
  fastify.get('/me/notifications', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { unreadOnly = false, limit = 20 } = request.query;
    
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params = [request.user.id];
    
    if (unreadOnly === 'true' || unreadOnly === true) {
      query += ' AND is_read = false';
    }
    
    query += ` ORDER BY created_at DESC LIMIT $2`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    return { notifications: result.rows };
  });
  
  /**
   * PATCH /api/users/me/notifications/:id/read
   * Mark notification as read
   */
  fastify.patch('/me/notifications/:id/read', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    
    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, request.user.id]
    );
    
    return { success: true };
  });
  
  /**
   * POST /api/users/me/notifications/read-all
   * Mark all notifications as read
   */
  fastify.post('/me/notifications/read-all', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [request.user.id]
    );
    
    return { success: true };
  });
}
