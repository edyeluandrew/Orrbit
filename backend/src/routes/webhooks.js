import { z } from 'zod';
import crypto from 'crypto';
import { notifyUser } from '../websocket/index.js';

const stellarPaymentSchema = z.object({
  id: z.string(),
  type: z.string(),
  paging_token: z.string(),
  transaction_successful: z.boolean(),
  source_account: z.string(),
  asset_type: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  transaction_hash: z.string(),
});

export default async function webhookRoutes(fastify, options) {
  const { db } = fastify;
  
  /**
   * POST /api/webhooks/stellar
   * Receive payment notifications from Stellar Horizon
   * Used to verify and confirm transactions
   */
  fastify.post('/stellar', async (request, reply) => {
    // Verify webhook signature if configured
    const webhookSecret = process.env.STELLAR_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers['x-signature'];
      const payload = JSON.stringify(request.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return reply.code(401).send({ error: 'Invalid signature' });
      }
    }
    
    try {
      const payment = stellarPaymentSchema.parse(request.body);
      
      // Only process successful XLM payments
      if (!payment.transaction_successful || payment.asset_type !== 'native') {
        return { status: 'ignored', reason: 'Not a successful XLM payment' };
      }
      
      // Check if we have a pending transaction for this hash
      const existingTx = await db.transactions.findByHash(payment.transaction_hash);
      
      if (existingTx) {
        // Update existing transaction to completed
        if (existingTx.status === 'pending') {
          await db.query(
            `UPDATE transactions SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [existingTx.id]
          );
          
          // Notify both parties
          if (existingTx.sender_id) {
            notifyUser(existingTx.sender_id, {
              type: 'transaction_confirmed',
              transactionId: existingTx.id,
              txHash: payment.transaction_hash,
            });
          }
          
          if (existingTx.recipient_id) {
            notifyUser(existingTx.recipient_id, {
              type: 'payment_received',
              transactionId: existingTx.id,
              amount: payment.amount,
              txHash: payment.transaction_hash,
            });
          }
        }
        
        return { status: 'processed', transactionId: existingTx.id };
      }
      
      // Check if recipient is a registered creator
      const creatorResult = await db.query(
        `SELECT c.*, u.id as user_id
         FROM creators c
         JOIN users u ON c.wallet_address = u.wallet_address
         WHERE c.wallet_address = $1`,
        [payment.to]
      );
      
      if (creatorResult.rows.length === 0) {
        return { status: 'ignored', reason: 'Recipient not a registered creator' };
      }
      
      const creator = creatorResult.rows[0];
      
      // Check if sender is a registered user
      const senderResult = await db.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [payment.from]
      );
      
      // Record the payment
      const amountXlm = parseFloat(payment.amount);
      const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;
      const platformFee = amountXlm * (platformFeePercent / 100);
      
      const txResult = await db.query(
        `INSERT INTO transactions 
         (sender_id, recipient_id, type, amount_xlm, platform_fee_xlm, tx_hash, status)
         VALUES ($1, $2, 'tip', $3, $4, $5, 'completed')
         RETURNING *`,
        [
          senderResult.rows[0]?.id,
          creator.user_id,
          amountXlm,
          platformFee,
          payment.transaction_hash,
        ]
      );
      
      // Update creator earnings
      await db.query(
        `UPDATE creators SET total_earnings = total_earnings + $2 WHERE id = $1`,
        [creator.id, amountXlm - platformFee]
      );
      
      // Notify creator
      notifyUser(creator.user_id, {
        type: 'payment_received',
        transactionId: txResult.rows[0].id,
        amount: amountXlm,
        from: payment.from,
        txHash: payment.transaction_hash,
      });
      
      return { status: 'recorded', transactionId: txResult.rows[0].id };
    } catch (error) {
      fastify.log.error('Webhook processing error:', error);
      return reply.code(400).send({ error: 'Invalid payload' });
    }
  });
  
  /**
   * POST /api/webhooks/subscription-renewal
   * Internal webhook for subscription renewal processing (called by cron job)
   */
  fastify.post('/subscription-renewal', async (request, reply) => {
    // Verify internal API key
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Find subscriptions due for renewal
    const dueSubscriptions = await db.query(
      `SELECT s.*, u.wallet_address as subscriber_wallet, u.display_name as subscriber_name,
              c.wallet_address as creator_wallet, c.id as creator_id,
              creator_user.id as creator_user_id
       FROM subscriptions s
       JOIN users u ON s.subscriber_id = u.id
       JOIN creators c ON s.creator_id = c.id
       JOIN users creator_user ON c.wallet_address = creator_user.wallet_address
       WHERE s.status = 'active' AND s.next_billing_at <= NOW()`,
      []
    );
    
    const results = {
      processed: 0,
      failed: 0,
      notifications_sent: 0,
    };
    
    for (const subscription of dueSubscriptions.rows) {
      // Mark subscription as past_due
      await db.query(
        `UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = $1`,
        [subscription.id]
      );
      
      // Notify subscriber about renewal needed
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'renewal_due', 'Subscription Renewal Due', $2, $3)`,
        [
          subscription.subscriber_id,
          `Your subscription is due for renewal. Please renew to continue supporting your favorite creator.`,
          JSON.stringify({ subscriptionId: subscription.id, amount: subscription.amount_xlm }),
        ]
      );
      
      notifyUser(subscription.subscriber_id, {
        type: 'renewal_due',
        subscriptionId: subscription.id,
        amount: subscription.amount_xlm,
        creatorId: subscription.creator_id,
      });
      
      results.processed++;
      results.notifications_sent++;
    }
    
    return results;
  });
  
  /**
   * GET /api/webhooks/health
   * Health check endpoint for monitoring webhook service
   */
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
