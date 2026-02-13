import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const dropTables = [
  'DROP TABLE IF EXISTS notifications CASCADE',
  'DROP TABLE IF EXISTS sessions CASCADE',
  'DROP TABLE IF EXISTS transactions CASCADE',
  'DROP TABLE IF EXISTS subscriptions CASCADE',
  'DROP TABLE IF EXISTS tiers CASCADE',
  'DROP TABLE IF EXISTS creators CASCADE',
  'DROP TABLE IF EXISTS users CASCADE',
];

async function reset() {
  const client = await pool.connect();
  
  console.log('⚠️  WARNING: This will delete ALL data!\n');
  console.log('🗑️  Dropping all tables...\n');
  
  try {
    for (const sql of dropTables) {
      const tableName = sql.match(/DROP TABLE IF EXISTS (\w+)/)?.[1] || 'unknown';
      process.stdout.write(`  Dropping: ${tableName}... `);
      
      try {
        await client.query(sql);
        console.log('✅');
      } catch (err) {
        console.log('❌', err.message);
      }
    }
    
    console.log('\n✅ Database reset complete!');
    console.log('📌 Run "npm run db:migrate" to recreate tables');
    console.log('📌 Run "npm run db:seed" to add test data\n');
    
  } catch (err) {
    console.error('\n❌ Reset failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
