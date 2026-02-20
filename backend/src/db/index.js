import pg from 'pg';
const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.MAX_POOL_SIZE) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection
export async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0].now);
    return true;
  } finally {
    client.release();
  }
}

// Query helper
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Query:', { text: text.slice(0, 100), duration: `${duration}ms`, rows: result.rowCount });
  }
  
  return result;
}

// Transaction helper
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Simple ORM-like helpers
export const db = {
  query,
  transaction,
  pool,
  
  // Users
  users: {
    async findByWallet(walletAddress) {
      const result = await query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [walletAddress]
      );
      return result.rows[0] || null;
    },
    
    async findById(id) {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    
    async create(data) {
      const result = await query(
        `INSERT INTO users (wallet_address, role, display_name, bio, avatar_url, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [data.walletAddress, data.role || 'subscriber', data.displayName, data.bio, data.avatarUrl]
      );
      return result.rows[0];
    },
    
    async update(id, data) {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      if (data.displayName !== undefined) {
        fields.push(`display_name = $${paramIndex++}`);
        values.push(data.displayName);
      }
      if (data.bio !== undefined) {
        fields.push(`bio = $${paramIndex++}`);
        values.push(data.bio);
      }
      if (data.avatarUrl !== undefined) {
        fields.push(`avatar_url = $${paramIndex++}`);
        values.push(data.avatarUrl);
      }
      if (data.role !== undefined) {
        fields.push(`role = $${paramIndex++}`);
        values.push(data.role);
      }
      
      fields.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0];
    },
  },
  
  // Creators
  creators: {
    async findByWallet(walletAddress) {
      const result = await query(
        `SELECT c.*, u.display_name, u.bio, u.avatar_url, u.wallet_address
         FROM creators c
         JOIN users u ON c.user_id = u.id
         WHERE u.wallet_address = $1`,
        [walletAddress]
      );
      return result.rows[0] || null;
    },
    
    async findById(id) {
      const result = await query(
        `SELECT c.*, u.display_name, u.bio, u.avatar_url, u.wallet_address
         FROM creators c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    },
    
    async findAll({ limit = 20, offset = 0, category, search, sortBy = 'subscribers' } = {}) {
      let whereClause = 'WHERE c.is_active = true';
      const params = [];
      let paramIndex = 1;
      
      if (category) {
        whereClause += ` AND c.category = $${paramIndex++}`;
        params.push(category);
      }
      
      if (search) {
        whereClause += ` AND (u.display_name ILIKE $${paramIndex} OR c.category ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      const orderBy = sortBy === 'recent' ? 'c.created_at DESC' : 'c.subscriber_count DESC';
      
      params.push(limit, offset);
      
      const result = await query(
        `SELECT c.*, u.display_name, u.bio, u.avatar_url, u.wallet_address
         FROM creators c
         JOIN users u ON c.user_id = u.id
         ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      );
      
      return result.rows;
    },
    
    async create(userId, data) {
      const result = await query(
        `INSERT INTO creators (user_id, category, is_verified, created_at)
         VALUES ($1, $2, false, NOW())
         RETURNING *`,
        [userId, data.category || 'general']
      );
      return result.rows[0];
    },
    
    async updateStats(id, { subscribers, earnings }) {
      const result = await query(
        `UPDATE creators 
         SET subscriber_count = COALESCE($2, subscriber_count),
             total_earnings = COALESCE($3, total_earnings),
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, subscribers, earnings]
      );
      return result.rows[0];
    },
  },
  
  // Subscriptions
  subscriptions: {
    async findByUserAndCreator(userId, creatorId) {
      const result = await query(
        `SELECT * FROM subscriptions 
         WHERE subscriber_id = $1 AND creator_id = $2 AND status = 'active'`,
        [userId, creatorId]
      );
      return result.rows[0] || null;
    },
    
    async findByUser(userId) {
      const result = await query(
        `SELECT s.*, c.category, u.display_name as creator_name, u.avatar_url as creator_avatar
         FROM subscriptions s
         JOIN creators c ON s.creator_id = c.id
         JOIN users u ON c.user_id = u.id
         WHERE s.subscriber_id = $1
         ORDER BY s.created_at DESC`,
        [userId]
      );
      return result.rows;
    },
    
    async findByCreator(creatorId) {
      const result = await query(
        `SELECT s.*, u.display_name as subscriber_name, u.avatar_url as subscriber_avatar
         FROM subscriptions s
         JOIN users u ON s.subscriber_id = u.id
         WHERE s.creator_id = $1
         ORDER BY s.created_at DESC`,
        [creatorId]
      );
      return result.rows;
    },
    
    async create(data) {
      const result = await query(
        `INSERT INTO subscriptions 
         (subscriber_id, creator_id, tier_id, amount_xlm, status, started_at, next_billing_at)
         VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '1 month')
         RETURNING *`,
        [data.subscriberId, data.creatorId, data.tierId, data.amountXlm]
      );
      return result.rows[0];
    },
    
    async cancel(id) {
      const result = await query(
        `UPDATE subscriptions 
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );
      return result.rows[0];
    },
    
    async getDueForRenewal() {
      const result = await query(
        `SELECT s.*, u.wallet_address as subscriber_wallet, 
                cu.wallet_address as creator_wallet
         FROM subscriptions s
         JOIN users u ON s.subscriber_id = u.id
         JOIN creators c ON s.creator_id = c.id
         JOIN users cu ON c.user_id = cu.id
         WHERE s.status = 'active' 
         AND s.next_billing_at <= NOW()`
      );
      return result.rows;
    },
  },
  
  // Transactions
  transactions: {
    async findByUser(userId, { limit = 50, offset = 0 } = {}) {
      const result = await query(
        `SELECT * FROM transactions 
         WHERE sender_id = $1 OR recipient_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return result.rows;
    },
    
    async findByHash(txHash) {
      const result = await query(
        'SELECT * FROM transactions WHERE tx_hash = $1',
        [txHash]
      );
      return result.rows[0] || null;
    },
    
    async create(data) {
      const result = await query(
        `INSERT INTO transactions 
         (sender_id, recipient_id, subscription_id, type, amount_xlm, platform_fee_xlm, 
          tx_hash, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          data.senderId, data.recipientId, data.subscriptionId, data.type,
          data.amountXlm, data.platformFeeXlm, data.txHash, data.status || 'completed'
        ]
      );
      return result.rows[0];
    },
    
    async updateStatus(id, status, txHash = null) {
      const result = await query(
        `UPDATE transactions 
         SET status = $2, tx_hash = COALESCE($3, tx_hash), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, status, txHash]
      );
      return result.rows[0];
    },
  },
  
  // Tiers
  tiers: {
    async findByCreator(creatorId) {
      const result = await query(
        `SELECT * FROM tiers WHERE creator_id = $1 AND is_active = true ORDER BY price_xlm ASC`,
        [creatorId]
      );
      return result.rows;
    },
    
    async create(data) {
      const result = await query(
        `INSERT INTO tiers (creator_id, name, description, price_xlm, benefits, tier_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.creatorId, data.name, data.description, data.priceXlm, 
         JSON.stringify(data.benefits || []), data.tierType || 'standard']
      );
      return result.rows[0];
    },
    
    async update(id, data) {
      const result = await query(
        `UPDATE tiers 
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             price_xlm = COALESCE($4, price_xlm),
             benefits = COALESCE($5, benefits),
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, data.name, data.description, data.priceXlm, 
         data.benefits ? JSON.stringify(data.benefits) : null]
      );
      return result.rows[0];
    },
    
    async delete(id) {
      await query('UPDATE tiers SET is_active = false WHERE id = $1', [id]);
    },
  },
};

export default db;
