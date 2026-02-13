import { z } from 'zod';

const updateCreatorSchema = z.object({
  category: z.string().max(50).optional(),
  socialLinks: z.record(z.string()).optional(),
});

const createTierSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  priceXlm: z.number().positive(),
  tierType: z.enum(['basic', 'standard', 'premium', 'vip']).default('standard'),
  benefits: z.array(z.string()).optional(),
});

export default async function creatorRoutes(fastify, options) {
  const { db } = fastify;
  
  /**
   * GET /api/creators
   * List all creators (with search/filter)
   */
  fastify.get('/', async (request, reply) => {
    const { 
      limit = 20, 
      offset = 0, 
      category, 
      search, 
      sortBy = 'subscribers' 
    } = request.query;
    
    const creators = await db.creators.findAll({
      limit: Math.min(parseInt(limit), 50),
      offset: parseInt(offset),
      category,
      search,
      sortBy,
    });
    
    return { 
      creators: creators.map(c => ({
        id: c.id,
        userId: c.user_id,
        walletAddress: c.wallet_address,
        displayName: c.display_name,
        bio: c.bio,
        avatarUrl: c.avatar_url,
        category: c.category,
        isVerified: c.is_verified,
        subscriberCount: c.subscriber_count,
        totalEarnings: c.total_earnings,
        socialLinks: c.social_links,
        badges: c.badges,
        createdAt: c.created_at,
      })),
    };
  });
  
  /**
   * GET /api/creators/featured
   * Get featured creators
   */
  fastify.get('/featured', async (request, reply) => {
    const result = await db.query(
      `SELECT c.*, u.display_name, u.bio, u.avatar_url, u.wallet_address
       FROM creators c
       JOIN users u ON c.user_id = u.id
       WHERE c.is_active = true AND (c.is_verified = true OR c.subscriber_count > 10)
       ORDER BY c.subscriber_count DESC
       LIMIT 6`
    );
    
    return { 
      creators: result.rows.map(c => ({
        id: c.id,
        walletAddress: c.wallet_address,
        displayName: c.display_name,
        bio: c.bio,
        avatarUrl: c.avatar_url,
        category: c.category,
        isVerified: c.is_verified,
        subscriberCount: c.subscriber_count,
      })),
    };
  });
  
  /**
   * GET /api/creators/:id
   * Get creator by ID
   */
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const creator = await db.creators.findById(id);
    
    if (!creator) {
      return reply.code(404).send({ error: 'Creator not found' });
    }
    
    // Get tiers
    const tiers = await db.tiers.findByCreator(id);
    
    return {
      creator: {
        id: creator.id,
        userId: creator.user_id,
        walletAddress: creator.wallet_address,
        displayName: creator.display_name,
        bio: creator.bio,
        avatarUrl: creator.avatar_url,
        category: creator.category,
        isVerified: creator.is_verified,
        subscriberCount: creator.subscriber_count,
        totalEarnings: creator.total_earnings,
        socialLinks: creator.social_links,
        badges: creator.badges,
        createdAt: creator.created_at,
      },
      tiers: tiers.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        priceXlm: parseFloat(t.price_xlm),
        tierType: t.tier_type,
        benefits: t.benefits,
      })),
    };
  });
  
  /**
   * GET /api/creators/wallet/:walletAddress
   * Get creator by wallet address
   */
  fastify.get('/wallet/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params;
    
    const creator = await db.creators.findByWallet(walletAddress);
    
    if (!creator) {
      return reply.code(404).send({ error: 'Creator not found' });
    }
    
    const tiers = await db.tiers.findByCreator(creator.id);
    
    return {
      creator: {
        id: creator.id,
        walletAddress: creator.wallet_address,
        displayName: creator.display_name,
        bio: creator.bio,
        avatarUrl: creator.avatar_url,
        category: creator.category,
        isVerified: creator.is_verified,
        subscriberCount: creator.subscriber_count,
        socialLinks: creator.social_links,
        badges: creator.badges,
      },
      tiers: tiers.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        priceXlm: parseFloat(t.price_xlm),
        tierType: t.tier_type,
        benefits: t.benefits,
      })),
    };
  });
  
  /**
   * PATCH /api/creators/me
   * Update current user's creator profile
   */
  fastify.patch('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = updateCreatorSchema.parse(request.body);
    
    // Check if user is a creator
    const creatorResult = await db.query(
      'SELECT * FROM creators WHERE user_id = $1',
      [request.user.id]
    );
    
    if (creatorResult.rows.length === 0) {
      return reply.code(403).send({ error: 'Not a creator' });
    }
    
    const creator = creatorResult.rows[0];
    
    // Update creator
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.category) {
      fields.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.socialLinks) {
      fields.push(`social_links = $${paramIndex++}`);
      values.push(JSON.stringify(data.socialLinks));
    }
    
    if (fields.length === 0) {
      return { creator };
    }
    
    fields.push('updated_at = NOW()');
    values.push(creator.id);
    
    const result = await db.query(
      `UPDATE creators SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return { creator: result.rows[0] };
  });
  
  /**
   * GET /api/creators/me/subscribers
   * Get creator's subscribers
   */
  fastify.get('/me/subscribers', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    // Get creator ID
    const creatorResult = await db.query(
      'SELECT id FROM creators WHERE user_id = $1',
      [request.user.id]
    );
    
    if (creatorResult.rows.length === 0) {
      return reply.code(403).send({ error: 'Not a creator' });
    }
    
    const subscribers = await db.subscriptions.findByCreator(creatorResult.rows[0].id);
    
    return { subscribers };
  });
  
  /**
   * GET /api/creators/me/stats
   * Get creator's stats/analytics
   */
  fastify.get('/me/stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const creatorResult = await db.query(
      'SELECT * FROM creators WHERE user_id = $1',
      [request.user.id]
    );
    
    if (creatorResult.rows.length === 0) {
      return reply.code(403).send({ error: 'Not a creator' });
    }
    
    const creator = creatorResult.rows[0];
    
    // Get monthly earnings
    const earningsResult = await db.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(amount_xlm - platform_fee_xlm) as earnings,
        COUNT(*) as transaction_count
       FROM transactions
       WHERE recipient_id = $1 AND status = 'completed'
       AND created_at > NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`,
      [request.user.id]
    );
    
    // Get recent subscribers
    const recentSubsResult = await db.query(
      `SELECT COUNT(*) as count FROM subscriptions
       WHERE creator_id = $1 AND started_at > NOW() - INTERVAL '30 days'`,
      [creator.id]
    );
    
    return {
      totalSubscribers: creator.subscriber_count,
      totalEarnings: parseFloat(creator.total_earnings),
      newSubscribersThisMonth: parseInt(recentSubsResult.rows[0].count),
      monthlyEarnings: earningsResult.rows.map(r => ({
        month: r.month,
        earnings: parseFloat(r.earnings),
        transactions: parseInt(r.transaction_count),
      })),
    };
  });
  
  /**
   * POST /api/creators/me/tiers
   * Create a new subscription tier
   */
  fastify.post('/me/tiers', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = createTierSchema.parse(request.body);
    
    const creatorResult = await db.query(
      'SELECT id FROM creators WHERE user_id = $1',
      [request.user.id]
    );
    
    if (creatorResult.rows.length === 0) {
      return reply.code(403).send({ error: 'Not a creator' });
    }
    
    const tier = await db.tiers.create({
      creatorId: creatorResult.rows[0].id,
      ...data,
    });
    
    return { tier };
  });
  
  /**
   * PATCH /api/creators/me/tiers/:tierId
   * Update a subscription tier
   */
  fastify.patch('/me/tiers/:tierId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tierId } = request.params;
    const data = createTierSchema.partial().parse(request.body);
    
    // Verify ownership
    const tierResult = await db.query(
      `SELECT t.* FROM tiers t
       JOIN creators c ON t.creator_id = c.id
       WHERE t.id = $1 AND c.user_id = $2`,
      [tierId, request.user.id]
    );
    
    if (tierResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Tier not found' });
    }
    
    const tier = await db.tiers.update(tierId, data);
    
    return { tier };
  });
  
  /**
   * DELETE /api/creators/me/tiers/:tierId
   * Delete a subscription tier
   */
  fastify.delete('/me/tiers/:tierId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tierId } = request.params;
    
    // Verify ownership
    const tierResult = await db.query(
      `SELECT t.* FROM tiers t
       JOIN creators c ON t.creator_id = c.id
       WHERE t.id = $1 AND c.user_id = $2`,
      [tierId, request.user.id]
    );
    
    if (tierResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Tier not found' });
    }
    
    await db.tiers.delete(tierId);
    
    return { success: true };
  });
}
