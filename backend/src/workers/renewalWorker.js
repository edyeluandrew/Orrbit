import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Subscription Renewal Worker
 * 
 * This worker handles:
 * 1. Finding subscriptions due for renewal
 * 2. Sending renewal reminders (3 days, 1 day before)
 * 3. Marking expired subscriptions
 * 4. Processing renewal notifications
 * 
 * Run via cron: 0 * * * * (every hour)
 * Or: node src/workers/renewalWorker.js
 */

const REMINDER_DAYS = [3, 1]; // Days before expiry to send reminders
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;

async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Send renewal reminder notifications
 */
async function sendRenewalReminders() {
  console.log('📧 Checking for renewal reminders...');
  
  for (const days of REMINDER_DAYS) {
    const result = await query(
      `SELECT s.*, 
              u.id as subscriber_user_id, u.display_name as subscriber_name, u.wallet_address as subscriber_wallet,
              cu.display_name as creator_name, cu.wallet_address as creator_wallet,
              t.name as tier_name, t.price_xlm as tier_price
       FROM subscriptions s
       JOIN users u ON s.subscriber_id = u.id
       JOIN creators c ON s.creator_id = c.id
       JOIN users cu ON c.user_id = cu.id
       LEFT JOIN tiers t ON s.tier_id = t.id
       WHERE s.status = 'active'
         AND s.next_billing_at::date = (CURRENT_DATE + ($1 || ' days')::INTERVAL)::date
         AND NOT EXISTS (
           SELECT 1 FROM notifications n 
           WHERE n.user_id = s.subscriber_id 
             AND n.type = 'renewal_reminder'
             AND n.data->>'subscription_id' = s.id::text
             AND n.data->>'days_until' = $2
         )`,
      [days, String(days)]
    );
    
    console.log(`  Found ${result.rows.length} subscriptions expiring in ${days} day(s)`);
    
    for (const sub of result.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'renewal_reminder', $2, $3, $4)`,
        [
          sub.subscriber_user_id,
          `Subscription renewing in ${days} day${days > 1 ? 's' : ''}`,
          `Your subscription to ${sub.creator_name} (${sub.tier_name || 'Standard'}) will renew for ${sub.amount_xlm} XLM.`,
          JSON.stringify({
            subscription_id: sub.id,
            creator_id: sub.creator_id,
            creator_name: sub.creator_name,
            creator_wallet: sub.creator_wallet,
            amount_xlm: sub.amount_xlm,
            days_until: days,
            next_billing_at: sub.next_billing_at,
          }),
        ]
      );
      console.log(`    ✓ Sent ${days}-day reminder to ${sub.subscriber_name}`);
    }
  }
}

/**
 * Process subscriptions due for renewal
 * Creates pending transactions for users to pay
 */
async function processRenewals() {
  console.log('\n💳 Processing due renewals...');
  
  const dueSubscriptions = await query(
    `SELECT s.*, 
            u.id as subscriber_user_id, u.display_name as subscriber_name, u.wallet_address as subscriber_wallet,
            cu.id as creator_user_id, cu.display_name as creator_name, cu.wallet_address as creator_wallet,
            c.id as creator_id,
            t.name as tier_name
     FROM subscriptions s
     JOIN users u ON s.subscriber_id = u.id
     JOIN creators c ON s.creator_id = c.id
     JOIN users cu ON c.user_id = cu.id
     LEFT JOIN tiers t ON s.tier_id = t.id
     WHERE s.status = 'active'
       AND s.next_billing_at <= NOW()`
  );
  
  console.log(`  Found ${dueSubscriptions.rows.length} subscriptions due for renewal`);
  
  for (const sub of dueSubscriptions.rows) {
    // Check if there's already a pending renewal transaction
    const existingTx = await query(
      `SELECT * FROM transactions 
       WHERE subscription_id = $1 AND type = 'renewal' AND status = 'pending'
       AND created_at > NOW() - INTERVAL '7 days'`,
      [sub.id]
    );
    
    if (existingTx.rows.length > 0) {
      console.log(`    ⏭️  ${sub.subscriber_name} - pending renewal already exists`);
      continue;
    }
    
    const platformFee = sub.amount_xlm * (PLATFORM_FEE_PERCENT / 100);
    
    // Create pending renewal transaction
    const txResult = await query(
      `INSERT INTO transactions 
       (sender_id, recipient_id, subscription_id, type, amount_xlm, platform_fee_xlm, status, memo)
       VALUES ($1, $2, $3, 'renewal', $4, $5, 'pending', $6)
       RETURNING *`,
      [
        sub.subscriber_user_id,
        sub.creator_user_id,
        sub.id,
        sub.amount_xlm,
        platformFee,
        `Renewal: ${sub.tier_name || 'Subscription'} to ${sub.creator_name}`,
      ]
    );
    
    // Notify subscriber
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'renewal_due', 'Subscription Renewal Due', $2, $3)`,
      [
        sub.subscriber_user_id,
        `Your subscription to ${sub.creator_name} is due for renewal. Pay ${sub.amount_xlm} XLM to continue.`,
        JSON.stringify({
          subscription_id: sub.id,
          transaction_id: txResult.rows[0].id,
          creator_wallet: sub.creator_wallet,
          amount_xlm: sub.amount_xlm,
        }),
      ]
    );
    
    console.log(`    ✓ Created renewal request for ${sub.subscriber_name} → ${sub.creator_name}`);
  }
}

/**
 * Expire overdue subscriptions (grace period: 7 days)
 */
async function expireOverdueSubscriptions() {
  console.log('\n⏰ Checking for expired subscriptions...');
  
  const GRACE_PERIOD_DAYS = 7;
  
  const expired = await query(
    `UPDATE subscriptions 
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active'
       AND next_billing_at < NOW() - INTERVAL '${GRACE_PERIOD_DAYS} days'
     RETURNING *`
  );
  
  console.log(`  Expired ${expired.rowCount} subscriptions (past ${GRACE_PERIOD_DAYS}-day grace period)`);
  
  // Update creator subscriber counts
  for (const sub of expired.rows) {
    await query(
      `UPDATE creators SET subscriber_count = subscriber_count - 1 WHERE id = $1`,
      [sub.creator_id]
    );
    
    // Notify both parties
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'subscription_expired', 'Subscription Expired', $2, $3)`,
      [
        sub.subscriber_id,
        'Your subscription has expired due to non-payment.',
        JSON.stringify({ subscription_id: sub.id, creator_id: sub.creator_id }),
      ]
    );
  }
}

/**
 * Process completed renewal payments
 * Called when a renewal transaction is confirmed
 */
async function processCompletedRenewals() {
  console.log('\n✅ Processing completed renewal payments...');
  
  // Find renewal transactions that were completed but subscription not updated
  const completed = await query(
    `SELECT t.*, s.id as sub_id, s.amount_xlm as sub_amount, s.creator_id
     FROM transactions t
     JOIN subscriptions s ON t.subscription_id = s.id
     WHERE t.type = 'renewal' 
       AND t.status = 'completed'
       AND t.tx_hash IS NOT NULL
       AND s.next_billing_at <= NOW()`
  );
  
  console.log(`  Found ${completed.rows.length} completed renewals to process`);
  
  for (const tx of completed.rows) {
    // Extend subscription by 1 month
    await query(
      `UPDATE subscriptions 
       SET next_billing_at = next_billing_at + INTERVAL '1 month',
           updated_at = NOW()
       WHERE id = $1`,
      [tx.sub_id]
    );
    
    // Update creator earnings
    const creatorEarnings = tx.amount_xlm - tx.platform_fee_xlm;
    await query(
      `UPDATE creators SET total_earnings = total_earnings + $2 WHERE id = $1`,
      [tx.creator_id, creatorEarnings]
    );
    
    console.log(`    ✓ Extended subscription #${tx.sub_id}`);
  }
}

/**
 * Generate daily stats
 */
async function generateDailyStats() {
  console.log('\n📊 Generating daily stats...');
  
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE) as new_users,
      (SELECT COUNT(*) FROM subscriptions WHERE started_at::date = CURRENT_DATE) as new_subscriptions,
      (SELECT COALESCE(SUM(amount_xlm), 0) FROM transactions WHERE status = 'completed' AND created_at::date = CURRENT_DATE) as daily_volume,
      (SELECT COALESCE(SUM(platform_fee_xlm), 0) FROM transactions WHERE status = 'completed' AND created_at::date = CURRENT_DATE) as daily_fees,
      (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
      (SELECT COUNT(*) FROM creators WHERE is_active = true) as active_creators
  `);
  
  const s = stats.rows[0];
  console.log(`  New users today: ${s.new_users}`);
  console.log(`  New subscriptions: ${s.new_subscriptions}`);
  console.log(`  Daily volume: ${s.daily_volume} XLM`);
  console.log(`  Platform fees: ${s.daily_fees} XLM`);
  console.log(`  Active subscriptions: ${s.active_subscriptions}`);
  console.log(`  Active creators: ${s.active_creators}`);
  
  return s;
}

/**
 * Main worker function
 */
async function runWorker() {
  console.log('🚀 Starting Renewal Worker...');
  console.log(`   Time: ${new Date().toISOString()}\n`);
  
  try {
    await sendRenewalReminders();
    await processRenewals();
    await processCompletedRenewals();
    await expireOverdueSubscriptions();
    await generateDailyStats();
    
    console.log('\n✅ Renewal worker completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Worker error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
runWorker()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export {
  sendRenewalReminders,
  processRenewals,
  processCompletedRenewals,
  expireOverdueSubscriptions,
  generateDailyStats,
};
