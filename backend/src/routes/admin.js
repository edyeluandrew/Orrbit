import { z } from 'zod';

// Validation schemas
const updateUserSchema = z.object({
  role: z.enum(['subscriber', 'creator', 'admin']).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().max(500).optional(),
});

const updateCreatorSchema = z.object({
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  category: z.string().max(50).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['all', 'subscriber', 'creator', 'admin']).default('all'),
  sortBy: z.enum(['created_at', 'display_name', 'wallet_address']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export default async function adminRoutes(fastify, options) {
  const { db } = fastify;
  
  // Admin-only auth decorator - checks wallet address against admin_wallets table
  fastify.decorate('adminOnly', async function (request, reply) {
    try {
      await request.jwtVerify();
      const walletAddress = request.user.walletAddress;
      
      // Check if wallet is in admin_wallets table
      const result = await db.query(
        `SELECT id, permissions FROM admin_wallets WHERE wallet_address = $1 AND is_active = true`,
        [walletAddress]
      );
      
      if (result.rows.length === 0) {
        // Fallback: check if user role is admin (for backwards compatibility)
        if (request.user.role !== 'admin') {
          return reply.code(403).send({ error: 'Forbidden', message: 'Admin access required' });
        }
      }
      
      // Attach admin info to request
      request.adminContext = result.rows[0] || { permissions: ['all'] };
      
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  // ============================================
  // ADMIN WALLET MANAGEMENT
  // ============================================

  /**
   * GET /api/admin/wallets
   * List all admin wallets
   */
  fastify.get('/wallets', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const result = await db.query(
      `SELECT id, wallet_address, label, is_active, permissions, added_by, created_at
       FROM admin_wallets ORDER BY created_at DESC`
    );
    return { wallets: result.rows };
  });

  /**
   * POST /api/admin/wallets
   * Add new admin wallet
   */
  fastify.post('/wallets', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { wallet_address, label, permissions = ['all'] } = request.body;
    
    if (!wallet_address || wallet_address.length !== 56) {
      return reply.code(400).send({ error: 'Invalid wallet address' });
    }
    
    try {
      const result = await db.query(
        `INSERT INTO admin_wallets (wallet_address, label, permissions, added_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [wallet_address, label, JSON.stringify(permissions), request.user.walletAddress]
      );
      return { wallet: result.rows[0], message: 'Admin wallet added successfully' };
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'Wallet already registered as admin' });
      }
      throw err;
    }
  });

  /**
   * DELETE /api/admin/wallets/:id
   * Remove admin wallet
   */
  fastify.delete('/wallets/:id', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    
    // Prevent removing self
    const wallet = await db.query(`SELECT wallet_address FROM admin_wallets WHERE id = $1`, [id]);
    if (wallet.rows.length > 0 && wallet.rows[0].wallet_address === request.user.walletAddress) {
      return reply.code(400).send({ error: 'Cannot remove your own admin access' });
    }
    
    await db.query(`DELETE FROM admin_wallets WHERE id = $1`, [id]);
    return { message: 'Admin wallet removed' };
  });

  /**
   * POST /api/admin/check
   * Check if current wallet is admin
   */
  fastify.post('/check', async (request, reply) => {
    try {
      await request.jwtVerify();
      const walletAddress = request.user.walletAddress;
      
      const result = await db.query(
        `SELECT id, permissions FROM admin_wallets WHERE wallet_address = $1 AND is_active = true`,
        [walletAddress]
      );
      
      const isAdmin = result.rows.length > 0 || request.user.role === 'admin';
      
      return { 
        isAdmin,
        permissions: result.rows[0]?.permissions || (request.user.role === 'admin' ? ['all'] : [])
      };
    } catch (err) {
      return { isAdmin: false, permissions: [] };
    }
  });

  // ============================================
  // DASHBOARD & STATS
  // ============================================

  /**
   * GET /api/admin/stats
   * Get platform overview statistics
   */
  fastify.get('/stats', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const [users, creators, subscriptions, transactions, recentActivity] = await Promise.all([
      // User stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE role = 'creator') as creators,
          COUNT(*) FILTER (WHERE role = 'subscriber') as subscribers,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
        FROM users
      `),
      
      // Creator stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_verified = true) as verified,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          SUM(subscriber_count) as total_subscribers,
          SUM(total_earnings) as total_earnings
        FROM creators
      `),
      
      // Subscription stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'expired') as expired,
          SUM(amount_xlm) FILTER (WHERE status = 'active') as mrr_xlm
        FROM subscriptions
      `),
      
      // Transaction stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          SUM(amount_xlm) FILTER (WHERE status = 'completed') as total_volume,
          SUM(platform_fee_xlm) FILTER (WHERE status = 'completed') as total_fees,
          SUM(amount_xlm) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days') as volume_30d,
          SUM(platform_fee_xlm) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days') as fees_30d
        FROM transactions
      `),
      
      // Recent activity
      db.query(`
        SELECT * FROM (
          SELECT 'new_user' as event_type, display_name as title, created_at, wallet_address as detail
          FROM users ORDER BY created_at DESC LIMIT 5
        ) u
        UNION ALL
        SELECT * FROM (
          SELECT 'transaction' as event_type, type as title, created_at, CONCAT(amount_xlm, ' XLM') as detail
          FROM transactions ORDER BY created_at DESC LIMIT 5
        ) t
        ORDER BY created_at DESC LIMIT 10
      `),
    ]);

    return {
      users: users.rows[0],
      creators: creators.rows[0],
      subscriptions: subscriptions.rows[0],
      transactions: transactions.rows[0],
      recentActivity: recentActivity.rows,
    };
  });

  /**
   * GET /api/admin/stats/chart
   * Get chart data for dashboard
   */
  fastify.get('/stats/chart', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { period = '30d' } = request.query;
    
    // Use parameterized interval to prevent SQL injection
    const intervalDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const groupBy = period === '7d' ? 'day' : period === '90d' ? 'week' : 'day';
    
    const [userGrowth, transactionVolume] = await Promise.all([
      db.query(`
        SELECT 
          DATE_TRUNC($1, created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY date
      `, [groupBy, intervalDays]),
      
      db.query(`
        SELECT 
          DATE_TRUNC($1, created_at) as date,
          SUM(amount_xlm) as volume,
          COUNT(*) as count
        FROM transactions
        WHERE status = 'completed' AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY date
      `, [groupBy, intervalDays]),
    ]);

    return {
      userGrowth: userGrowth.rows,
      transactionVolume: transactionVolume.rows,
    };
  });

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * GET /api/admin/users
   * List all users with pagination and filters
   */
  fastify.get('/users', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const query = querySchema.parse(request.query);
    const offset = (query.page - 1) * query.limit;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (query.search) {
      whereClause += ` AND (display_name ILIKE $${paramIndex} OR wallet_address ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }
    
    if (query.role !== 'all') {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(query.role);
      paramIndex++;
    }
    
    params.push(query.limit, offset);
    
    const [users, countResult] = await Promise.all([
      db.query(
        `SELECT id, wallet_address, role, display_name, bio, avatar_url, email, 
                email_verified, is_banned, ban_reason, created_at, updated_at
         FROM users
         WHERE ${whereClause}
         ORDER BY ${query.sortBy} ${query.order}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      ),
      db.query(`SELECT COUNT(*) FROM users WHERE ${whereClause}`, params.slice(0, -2)),
    ]);

    return {
      users: users.rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / query.limit),
      },
    };
  });

  /**
   * GET /api/admin/users/:id
   * Get detailed user info
   */
  fastify.get('/users/:id', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    
    const [user, subscriptions, transactions, creator] = await Promise.all([
      db.query('SELECT * FROM users WHERE id = $1', [id]),
      db.query('SELECT * FROM subscriptions WHERE subscriber_id = $1 ORDER BY created_at DESC LIMIT 10', [id]),
      db.query('SELECT * FROM transactions WHERE sender_id = $1 OR recipient_id = $1 ORDER BY created_at DESC LIMIT 10', [id]),
      db.query('SELECT * FROM creators WHERE user_id = $1', [id]),
    ]);

    if (user.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return {
      user: user.rows[0],
      subscriptions: subscriptions.rows,
      transactions: transactions.rows,
      creator: creator.rows[0] || null,
    };
  });

  /**
   * PATCH /api/admin/users/:id
   * Update user (role, ban status)
   */
  fastify.patch('/users/:id', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    const data = updateUserSchema.parse(request.body);
    
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.isBanned !== undefined) {
      fields.push(`is_banned = $${paramIndex++}`);
      values.push(data.isBanned);
    }
    if (data.banReason !== undefined) {
      fields.push(`ban_reason = $${paramIndex++}`);
      values.push(data.banReason);
    }
    
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { user: result.rows[0] };
  });

  /**
   * DELETE /api/admin/users/:id
   * Soft delete / deactivate user
   */
  fastify.delete('/users/:id', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    
    // Don't allow deleting self
    if (parseInt(id) === request.user.id) {
      return reply.code(400).send({ error: 'Cannot delete own account' });
    }
    
    const result = await db.query(
      `UPDATE users SET is_banned = true, ban_reason = 'Account deactivated by admin', updated_at = NOW() 
       WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { success: true, message: 'User deactivated' };
  });

  // ============================================
  // CREATOR MANAGEMENT
  // ============================================

  /**
   * GET /api/admin/creators
   * List all creators with filters
   */
  fastify.get('/creators', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { page = 1, limit = 20, search, verified, active, category } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` AND (u.display_name ILIKE $${paramIndex} OR u.wallet_address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (verified !== undefined) {
      whereClause += ` AND c.is_verified = $${paramIndex}`;
      params.push(verified === 'true');
      paramIndex++;
    }
    if (active !== undefined) {
      whereClause += ` AND c.is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }
    if (category) {
      whereClause += ` AND c.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    params.push(parseInt(limit), offset);
    
    const [creators, countResult] = await Promise.all([
      db.query(
        `SELECT c.*, u.display_name, u.wallet_address, u.avatar_url, u.email, u.is_banned
         FROM creators c
         JOIN users u ON c.user_id = u.id
         WHERE ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM creators c JOIN users u ON c.user_id = u.id WHERE ${whereClause}`,
        params.slice(0, -2)
      ),
    ]);

    return {
      creators: creators.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    };
  });

  /**
   * PATCH /api/admin/creators/:id
   * Update creator (verify, feature, activate/deactivate)
   */
  fastify.patch('/creators/:id', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    const data = updateCreatorSchema.parse(request.body);
    
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.isVerified !== undefined) {
      fields.push(`is_verified = $${paramIndex++}`);
      values.push(data.isVerified);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }
    if (data.isFeatured !== undefined) {
      fields.push(`is_featured = $${paramIndex++}`);
      values.push(data.isFeatured);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const result = await db.query(
      `UPDATE creators SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Creator not found' });
    }

    // Create notification for creator
    const creator = result.rows[0];
    if (data.isVerified === true) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'verification', 'Account Verified!', 'Congratulations! Your creator account has been verified.')`,
        [creator.user_id]
      );
    }

    return { creator: result.rows[0] };
  });

  /**
   * POST /api/admin/creators/:id/verify
   * Quick verify action
   */
  fastify.post('/creators/:id/verify', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    
    const result = await db.query(
      `UPDATE creators SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Creator not found' });
    }

    // Notify creator
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'verification', 'Account Verified!', 'Congratulations! Your creator account has been verified.')`,
      [result.rows[0].user_id]
    );

    return { creator: result.rows[0], message: 'Creator verified successfully' };
  });

  // ============================================
  // TRANSACTION OVERSIGHT
  // ============================================

  /**
   * GET /api/admin/transactions
   * List all transactions
   */
  fastify.get('/transactions', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { page = 1, limit = 50, type, status, minAmount, maxAmount } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (type && type !== 'all') {
      whereClause += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (status && status !== 'all') {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (minAmount) {
      whereClause += ` AND t.amount_xlm >= $${paramIndex}`;
      params.push(parseFloat(minAmount));
      paramIndex++;
    }
    if (maxAmount) {
      whereClause += ` AND t.amount_xlm <= $${paramIndex}`;
      params.push(parseFloat(maxAmount));
      paramIndex++;
    }
    
    params.push(parseInt(limit), offset);
    
    const [transactions, countResult] = await Promise.all([
      db.query(
        `SELECT t.*, 
                sender.display_name as sender_name, sender.wallet_address as sender_wallet,
                recipient.display_name as recipient_name, recipient.wallet_address as recipient_wallet
         FROM transactions t
         LEFT JOIN users sender ON t.sender_id = sender.id
         LEFT JOIN users recipient ON t.recipient_id = recipient.id
         WHERE ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      ),
      db.query(`SELECT COUNT(*) FROM transactions t WHERE ${whereClause}`, params.slice(0, -2)),
    ]);

    return {
      transactions: transactions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    };
  });

  /**
   * PATCH /api/admin/transactions/:id
   * Update transaction status (for disputes/refunds)
   */
  fastify.patch('/transactions/:id', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params;
    const { status, adminNote } = request.body;
    
    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return reply.code(400).send({ error: 'Invalid status' });
    }
    
    const result = await db.query(
      `UPDATE transactions SET status = $2, memo = COALESCE(memo || ' | ', '') || $3, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id, status, adminNote ? `[Admin: ${adminNote}]` : '']
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Transaction not found' });
    }

    return { transaction: result.rows[0] };
  });

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * GET /api/admin/subscriptions
   * List all subscriptions
   */
  fastify.get('/subscriptions', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { page = 1, limit = 50, status } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (status && status !== 'all') {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    params.push(parseInt(limit), offset);
    
    const [subscriptions, countResult] = await Promise.all([
      db.query(
        `SELECT s.*, 
                subscriber.display_name as subscriber_name, subscriber.wallet_address as subscriber_wallet,
                creator_user.display_name as creator_name, creator_user.wallet_address as creator_wallet
         FROM subscriptions s
         JOIN users subscriber ON s.subscriber_id = subscriber.id
         JOIN creators c ON s.creator_id = c.id
         JOIN users creator_user ON c.user_id = creator_user.id
         WHERE ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      ),
      db.query(`SELECT COUNT(*) FROM subscriptions s WHERE ${whereClause}`, params.slice(0, -2)),
    ]);

    return {
      subscriptions: subscriptions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    };
  });

  // ============================================
  // PLATFORM SETTINGS
  // ============================================

  /**
   * GET /api/admin/settings
   * Get platform settings from database
   */
  fastify.get('/settings', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    // Get settings from database
    const result = await db.query(`SELECT key, value FROM platform_settings`);
    
    // Convert to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    // Return with defaults for any missing values
    return {
      platform_fee_percent: parseFloat(settings.platform_fee_percent) || 2,
      min_subscription_xlm: parseFloat(settings.min_subscription_xlm) || 1,
      max_subscription_xlm: parseFloat(settings.max_subscription_xlm) || 10000,
      platform_wallet: settings.platform_wallet || '',
      stellar_network: settings.stellar_network || 'testnet',
      maintenance_mode: settings.maintenance_mode === 'true',
      allow_new_registrations: settings.allow_new_registrations !== 'false',
    };
  });

  /**
   * PUT /api/admin/settings
   * Update platform settings
   */
  fastify.put('/settings', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const updates = request.body;
    const allowedKeys = [
      'platform_fee_percent',
      'min_subscription_xlm', 
      'max_subscription_xlm',
      'platform_wallet',
      'stellar_network',
      'maintenance_mode',
      'allow_new_registrations'
    ];
    
    const results = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;
      
      await db.query(
        `INSERT INTO platform_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, String(value), request.user.walletAddress]
      );
      results.push(key);
    }
    
    return { message: 'Settings updated', updated: results };
  });

  /**
   * GET /api/admin/settings/public
   * Get public platform settings (no auth required)
   */
  fastify.get('/settings/public', async (request, reply) => {
    const result = await db.query(
      `SELECT key, value FROM platform_settings 
       WHERE key IN ('platform_fee_percent', 'platform_wallet', 'stellar_network', 'maintenance_mode')`
    );
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return {
      platform_fee_percent: parseFloat(settings.platform_fee_percent) || 2,
      platform_wallet: settings.platform_wallet || '',
      stellar_network: settings.stellar_network || 'testnet',
      maintenance_mode: settings.maintenance_mode === 'true',
    };
  });

  // ============================================
  // PLATFORM EARNINGS & WITHDRAWAL
  // ============================================

  /**
   * GET /api/admin/earnings
   * Get platform earnings summary
   */
  fastify.get('/earnings', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const [summary, recent] = await Promise.all([
      db.query(`
        SELECT 
          COALESCE(SUM(amount_xlm), 0) as total_earned,
          COALESCE(SUM(amount_xlm) FILTER (WHERE status = 'collected'), 0) as available,
          COALESCE(SUM(amount_xlm) FILTER (WHERE status = 'withdrawn'), 0) as withdrawn
        FROM platform_earnings
      `),
      db.query(`
        SELECT pe.*, t.type as transaction_type, t.tx_hash as source_tx_hash
        FROM platform_earnings pe
        LEFT JOIN transactions t ON pe.transaction_id = t.id
        ORDER BY pe.created_at DESC
        LIMIT 50
      `)
    ]);
    
    return {
      summary: summary.rows[0],
      recent: recent.rows
    };
  });

  /**
   * POST /api/admin/withdraw
   * Request withdrawal of platform earnings
   */
  fastify.post('/withdraw', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { amount_xlm, destination_wallet } = request.body;
    
    if (!amount_xlm || amount_xlm <= 0) {
      return reply.code(400).send({ error: 'Invalid amount' });
    }
    
    if (!destination_wallet || destination_wallet.length !== 56) {
      return reply.code(400).send({ error: 'Invalid destination wallet' });
    }
    
    // Check available balance
    const available = await db.query(
      `SELECT COALESCE(SUM(amount_xlm), 0) as available FROM platform_earnings WHERE status = 'collected'`
    );
    
    if (parseFloat(available.rows[0].available) < amount_xlm) {
      return reply.code(400).send({ error: 'Insufficient platform balance' });
    }
    
    // TODO: Execute actual Stellar withdrawal transaction here
    // For now, mark earnings as withdrawn (would need Stellar SDK integration)
    
    // Record withdrawal request
    const result = await db.query(
      `INSERT INTO transactions (sender_id, type, amount_xlm, status, memo)
       VALUES (NULL, 'payout', $1, 'pending', $2)
       RETURNING *`,
      [amount_xlm, `Platform withdrawal to ${destination_wallet}`]
    );
    
    return {
      message: 'Withdrawal request created',
      transaction: result.rows[0],
      note: 'Manual withdrawal required - execute Stellar transaction and update status'
    };
  });

  // ============================================
  // LOGS & AUDIT
  // ============================================

  /**
   * GET /api/admin/audit
   * Get audit log (recent admin actions & system events)
   */
  fastify.get('/audit', {
    preHandler: [fastify.adminOnly],
  }, async (request, reply) => {
    const { limit = 50 } = request.query;
    
    // Get recent notifications that could serve as audit trail
    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE type IN ('verification', 'system', 'admin_action')
       ORDER BY created_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    return { events: result.rows };
  });
}
