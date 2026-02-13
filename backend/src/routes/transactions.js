import { z } from 'zod';

const tipSchema = z.object({
  creatorId: z.number().int().positive(),
  amountXlm: z.number().positive(),
  txHash: z.string().length(64),
  message: z.string().max(500).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['all', 'subscription', 'renewal', 'tip', 'withdrawal']).default('all'),
  status: z.enum(['all', 'pending', 'completed', 'failed']).default('all'),
});

export default async function transactionRoutes(fastify, options) {
  const { db } = fastify;
  
  /**
   * GET /api/transactions
   * Get all transactions for the authenticated user
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const query = querySchema.parse(request.query);
    const offset = (query.page - 1) * query.limit;
    
    let whereClause = '(t.sender_id = $1 OR t.recipient_id = $1)';
    const params = [request.user.id, query.limit, offset];
    let paramIndex = 4;
    
    if (query.type !== 'all') {
      whereClause += ` AND t.type = $${paramIndex}`;
      params.push(query.type);
      paramIndex++;
    }
    
    if (query.status !== 'all') {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }
    
    const result = await db.query(
      `SELECT t.*, 
              sender.display_name as sender_name, sender.wallet_address as sender_wallet,
              recipient.display_name as recipient_name, recipient.wallet_address as recipient_wallet,
              c.id as creator_id
       FROM transactions t
       LEFT JOIN users sender ON t.sender_id = sender.id
       LEFT JOIN users recipient ON t.recipient_id = recipient.id
       LEFT JOIN subscriptions s ON t.subscription_id = s.id
       LEFT JOIN creators c ON s.creator_id = c.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );
    
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM transactions t WHERE ${whereClause.replace(/\$\d+/g, (match) => {
        const num = parseInt(match.slice(1));
        return num <= params.length - 2 ? match : `$${num - 2}`;
      })}`,
      params.slice(0, 1).concat(params.slice(3))
    );
    
    return {
      transactions: result.rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / query.limit),
      },
    };
  });
  
  /**
   * GET /api/transactions/:id
   * Get a specific transaction
   */
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    
    const result = await db.query(
      `SELECT t.*, 
              sender.display_name as sender_name, sender.wallet_address as sender_wallet,
              recipient.display_name as recipient_name, recipient.wallet_address as recipient_wallet
       FROM transactions t
       LEFT JOIN users sender ON t.sender_id = sender.id
       LEFT JOIN users recipient ON t.recipient_id = recipient.id
       WHERE t.id = $1 AND (t.sender_id = $2 OR t.recipient_id = $2)`,
      [id, request.user.id]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Transaction not found' });
    }
    
    return { transaction: result.rows[0] };
  });
  
  /**
   * POST /api/transactions/tip
   * Record a tip transaction
   */
  fastify.post('/tip', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = tipSchema.parse(request.body);
    
    // Check for duplicate transaction
    const existingTx = await db.transactions.findByHash(data.txHash);
    if (existingTx) {
      return reply.code(409).send({ error: 'Transaction already processed' });
    }
    
    // Get creator info
    const creator = await db.creators.findById(data.creatorId);
    if (!creator) {
      return reply.code(404).send({ error: 'Creator not found' });
    }
    
    // Get recipient user ID
    const recipientResult = await db.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [creator.wallet_address]
    );
    
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;
    const platformFee = data.amountXlm * (platformFeePercent / 100);
    
    const result = await db.transaction(async (client) => {
      // Create transaction record
      const txResult = await client.query(
        `INSERT INTO transactions 
         (sender_id, recipient_id, type, amount_xlm, platform_fee_xlm, tx_hash, memo, status)
         VALUES ($1, $2, 'tip', $3, $4, $5, $6, 'completed')
         RETURNING *`,
        [
          request.user.id,
          recipientResult.rows[0]?.id,
          data.amountXlm,
          platformFee,
          data.txHash,
          data.message,
        ]
      );
      
      // Update creator earnings
      await client.query(
        `UPDATE creators 
         SET total_earnings = total_earnings + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [data.creatorId, data.amountXlm - platformFee]
      );
      
      // Create notification for creator
      const senderResult = await client.query(
        'SELECT display_name FROM users WHERE id = $1',
        [request.user.id]
      );
      
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'tip_received', 'Tip Received!', $2, $3)`,
        [
          recipientResult.rows[0]?.id,
          `${senderResult.rows[0]?.display_name || 'Someone'} sent you ${data.amountXlm} XLM tip!`,
          JSON.stringify({ transactionId: txResult.rows[0].id, amount: data.amountXlm, message: data.message }),
        ]
      );
      
      return txResult.rows[0];
    });
    
    return { transaction: result };
  });
  
  /**
   * GET /api/transactions/stats
   * Get transaction statistics for the authenticated user
   */
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    // Total earnings (as recipient)
    const earningsResult = await db.query(
      `SELECT 
         COALESCE(SUM(amount_xlm - platform_fee_xlm), 0) as total_earnings,
         COALESCE(SUM(CASE WHEN type = 'subscription' THEN amount_xlm - platform_fee_xlm ELSE 0 END), 0) as subscription_earnings,
         COALESCE(SUM(CASE WHEN type = 'tip' THEN amount_xlm - platform_fee_xlm ELSE 0 END), 0) as tip_earnings
       FROM transactions 
       WHERE recipient_id = $1 AND status = 'completed'`,
      [request.user.id]
    );
    
    // Total spent (as sender)
    const spentResult = await db.query(
      `SELECT 
         COALESCE(SUM(amount_xlm), 0) as total_spent,
         COUNT(*) as transaction_count
       FROM transactions 
       WHERE sender_id = $1 AND status = 'completed'`,
      [request.user.id]
    );
    
    // Monthly breakdown (last 6 months)
    const monthlyResult = await db.query(
      `SELECT 
         DATE_TRUNC('month', created_at) as month,
         SUM(CASE WHEN recipient_id = $1 THEN amount_xlm - platform_fee_xlm ELSE 0 END) as earnings,
         SUM(CASE WHEN sender_id = $1 THEN amount_xlm ELSE 0 END) as spent
       FROM transactions 
       WHERE (sender_id = $1 OR recipient_id = $1)
         AND status = 'completed'
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`,
      [request.user.id]
    );
    
    return {
      earnings: {
        total: parseFloat(earningsResult.rows[0].total_earnings),
        subscriptions: parseFloat(earningsResult.rows[0].subscription_earnings),
        tips: parseFloat(earningsResult.rows[0].tip_earnings),
      },
      spent: {
        total: parseFloat(spentResult.rows[0].total_spent),
        transactionCount: parseInt(spentResult.rows[0].transaction_count),
      },
      monthlyBreakdown: monthlyResult.rows.map(row => ({
        month: row.month,
        earnings: parseFloat(row.earnings),
        spent: parseFloat(row.spent),
      })),
    };
  });
}
