import { z } from 'zod';
import { processSubscriptionPayment } from '../services/stellar.js';
import { notifyUser } from '../websocket/index.js';

const subscribeSchema = z.object({
  creatorId: z.number().int().positive(),
  tierId: z.number().int().positive().optional(),
  amountXlm: z.number().positive(),
  txHash: z.string().length(64),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export default async function subscriptionRoutes(fastify, options) {
  const { db } = fastify;
  
  /**
   * POST /api/subscriptions
   * Create a new subscription (after payment is made on-chain)
   */
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = subscribeSchema.parse(request.body);
    
    // Check if already subscribed
    const existing = await db.subscriptions.findByUserAndCreator(
      request.user.id,
      data.creatorId
    );
    
    if (existing) {
      return reply.code(409).send({ error: 'Already subscribed to this creator' });
    }
    
    // Verify the transaction on Stellar (in production)
    // For now, we trust the client-provided txHash
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
    
    // Create subscription and transaction in one transaction
    const result = await db.transaction(async (client) => {
      // Create subscription
      const subResult = await client.query(
        `INSERT INTO subscriptions 
         (subscriber_id, creator_id, tier_id, amount_xlm, status, started_at, next_billing_at)
         VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '1 month')
         RETURNING *`,
        [request.user.id, data.creatorId, data.tierId, data.amountXlm]
      );
      
      // Create transaction record
      const txResult = await client.query(
        `INSERT INTO transactions 
         (sender_id, recipient_id, subscription_id, type, amount_xlm, platform_fee_xlm, tx_hash, status)
         VALUES ($1, $2, $3, 'subscription', $4, $5, $6, 'completed')
         RETURNING *`,
        [
          request.user.id,
          recipientResult.rows[0]?.id,
          subResult.rows[0].id,
          data.amountXlm,
          platformFee,
          data.txHash,
        ]
      );
      
      // Update creator stats
      await client.query(
        `UPDATE creators 
         SET subscriber_count = subscriber_count + 1,
             total_earnings = total_earnings + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [data.creatorId, data.amountXlm - platformFee]
      );
      
      // Track platform earnings
      if (platformFee > 0) {
        await client.query(
          `INSERT INTO platform_earnings (transaction_id, amount_xlm, fee_type, status)
           VALUES ($1, $2, 'subscription_fee', 'collected')`,
          [txResult.rows[0].id, platformFee]
        );
      }
      
      // Create notification for creator
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'new_subscriber', 'New Subscriber!', $2, $3)`,
        [
          recipientResult.rows[0]?.id,
          `You have a new subscriber! They paid ${data.amountXlm} XLM.`,
          JSON.stringify({ subscriptionId: subResult.rows[0].id, amount: data.amountXlm }),
        ]
      );
      
      return {
        subscription: subResult.rows[0],
        transaction: txResult.rows[0],
      };
    });
    
    // Notify creator via WebSocket
    if (recipientResult.rows[0]?.id) {
      notifyUser(recipientResult.rows[0].id, {
        type: 'new_subscriber',
        subscription: result.subscription,
        amount: data.amountXlm,
      });
    }
    
    return result;
  });
  
  /**
   * GET /api/subscriptions/:id
   * Get subscription details
   */
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    
    const result = await db.query(
      `SELECT s.*, c.category, u.display_name as creator_name, u.avatar_url as creator_avatar,
              u.wallet_address as creator_wallet
       FROM subscriptions s
       JOIN creators c ON s.creator_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE s.id = $1 AND s.subscriber_id = $2`,
      [id, request.user.id]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Subscription not found' });
    }
    
    return { subscription: result.rows[0] };
  });
  
  /**
   * POST /api/subscriptions/:id/cancel
   * Cancel a subscription
   */
  fastify.post('/:id/cancel', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    const data = cancelSchema.parse(request.body || {});
    
    // Verify ownership
    const subResult = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1 AND subscriber_id = $2',
      [id, request.user.id]
    );
    
    if (subResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Subscription not found' });
    }
    
    const subscription = subResult.rows[0];
    
    if (subscription.status !== 'active') {
      return reply.code(400).send({ error: 'Subscription is not active' });
    }
    
    // Cancel subscription
    const cancelled = await db.subscriptions.cancel(id);
    
    // Update creator stats
    await db.query(
      `UPDATE creators SET subscriber_count = subscriber_count - 1 WHERE id = $1`,
      [subscription.creator_id]
    );
    
    // Notify creator
    const creatorResult = await db.query(
      'SELECT user_id FROM creators WHERE id = $1',
      [subscription.creator_id]
    );
    
    if (creatorResult.rows[0]) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'subscription_cancelled', 'Subscription Cancelled', $2, $3)`,
        [
          creatorResult.rows[0].user_id,
          'A subscriber has cancelled their subscription.',
          JSON.stringify({ subscriptionId: id, reason: data.reason }),
        ]
      );
      
      notifyUser(creatorResult.rows[0].user_id, {
        type: 'subscription_cancelled',
        subscriptionId: id,
      });
    }
    
    return { subscription: cancelled };
  });
  
  /**
   * POST /api/subscriptions/:id/renew
   * Manually renew a subscription
   */
  fastify.post('/:id/renew', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    const { txHash } = request.body;
    
    if (!txHash) {
      return reply.code(400).send({ error: 'Transaction hash required' });
    }
    
    // Verify ownership and status
    const subResult = await db.query(
      `SELECT s.*, u.wallet_address as creator_wallet
       FROM subscriptions s
       JOIN creators c ON s.creator_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE s.id = $1 AND s.subscriber_id = $2`,
      [id, request.user.id]
    );
    
    if (subResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Subscription not found' });
    }
    
    const subscription = subResult.rows[0];
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;
    const platformFee = parseFloat(subscription.amount_xlm) * (platformFeePercent / 100);
    
    // Get recipient user ID
    const recipientResult = await db.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [subscription.creator_wallet]
    );
    
    // Update subscription and create transaction
    const result = await db.transaction(async (client) => {
      // Update subscription
      const updatedSub = await client.query(
        `UPDATE subscriptions 
         SET next_billing_at = NOW() + INTERVAL '1 month',
             status = 'active',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      
      // Create transaction
      const txResult = await client.query(
        `INSERT INTO transactions 
         (sender_id, recipient_id, subscription_id, type, amount_xlm, platform_fee_xlm, tx_hash, status)
         VALUES ($1, $2, $3, 'renewal', $4, $5, $6, 'completed')
         RETURNING *`,
        [
          request.user.id,
          recipientResult.rows[0]?.id,
          id,
          subscription.amount_xlm,
          platformFee,
          txHash,
        ]
      );
      
      // Update creator earnings
      await client.query(
        `UPDATE creators 
         SET total_earnings = total_earnings + $2
         WHERE id = $1`,
        [subscription.creator_id, parseFloat(subscription.amount_xlm) - platformFee]
      );
      
      // Track platform earnings
      if (platformFee > 0) {
        await client.query(
          `INSERT INTO platform_earnings (transaction_id, amount_xlm, fee_type, status)
           VALUES ($1, $2, 'renewal_fee', 'collected')`,
          [txResult.rows[0].id, platformFee]
        );
      }
      
      return {
        subscription: updatedSub.rows[0],
        transaction: txResult.rows[0],
      };
    });
    
    return result;
  });
}
