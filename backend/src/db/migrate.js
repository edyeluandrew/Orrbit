import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(56) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'creator', 'admin')),
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    nonce VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Creators table (extends users)
  `CREATE TABLE IF NOT EXISTS creators (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    subscriber_count INTEGER DEFAULT 0,
    total_earnings DECIMAL(20, 7) DEFAULT 0,
    social_links JSONB DEFAULT '{}',
    badges JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Subscription tiers
  `CREATE TABLE IF NOT EXISTS tiers (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_xlm DECIMAL(20, 7) NOT NULL,
    tier_type VARCHAR(20) DEFAULT 'standard' CHECK (tier_type IN ('basic', 'standard', 'premium', 'vip')),
    benefits JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Subscriptions
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
    tier_id INTEGER REFERENCES tiers(id),
    amount_xlm DECIMAL(20, 7) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_billing_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscriber_id, creator_id)
  )`,
  
  // Transactions
  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    recipient_id INTEGER REFERENCES users(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('subscription', 'renewal', 'tip', 'refund', 'payout')),
    amount_xlm DECIMAL(20, 7) NOT NULL,
    platform_fee_xlm DECIMAL(20, 7) DEFAULT 0,
    tx_hash VARCHAR(64),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Sessions (for refresh tokens)
  `CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)`,
  `CREATE INDEX IF NOT EXISTS idx_creators_user ON creators(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_creators_category ON creators(category)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_at) WHERE status = 'active'`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_tiers_creator ON tiers(creator_id)`,
  
  // Add new columns for admin functionality (for existing databases)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`,
  `ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`,
  
  // Index for featured creators
  `CREATE INDEX IF NOT EXISTS idx_creators_featured ON creators(is_featured) WHERE is_featured = true`,
];

async function migrate() {
  const client = await pool.connect();
  
  console.log('🚀 Starting database migration...\n');
  
  try {
    for (const sql of migrations) {
      const shortSql = sql.replace(/\s+/g, ' ').slice(0, 60);
      process.stdout.write(`  Running: ${shortSql}... `);
      
      try {
        await client.query(sql);
        console.log('✅');
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710') {
          // Table or index already exists
          console.log('⏭️  (already exists)');
        } else {
          console.log('❌');
          throw err;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
