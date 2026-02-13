import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  console.log('🌱 Starting database seed...\n');
  
  try {
    // Create sample users
    console.log('Creating sample users...');
    const users = await pool.query(`
      INSERT INTO users (wallet_address, display_name, bio, avatar_url, is_creator)
      VALUES 
        ('GDEMO1CREATORADDRESS001234567890ABCDEFGHIJK', 'Alex Creator', 'Digital artist and NFT enthusiast', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex', true),
        ('GDEMO2CREATORADDRESS001234567890ABCDEFGHIJK', 'Sarah Music', 'Indie musician sharing exclusive tracks', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', true),
        ('GDEMO3CREATORADDRESS001234567890ABCDEFGHIJK', 'Tech Tutorials', 'Teaching web3 development', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech', true),
        ('GDEMO4SUBSCRIBERADDR01234567890ABCDEFGHIJK', 'John Supporter', 'Art lover and early adopter', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', false),
        ('GDEMO5SUBSCRIBERADDR01234567890ABCDEFGHIJK', 'Emily Fan', 'Music enthusiast', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily', false)
      ON CONFLICT (wallet_address) DO NOTHING
      RETURNING id, display_name
    `);
    console.log(`  ✓ Created ${users.rowCount} users\n`);
    
    // Get user IDs for reference
    const usersResult = await pool.query('SELECT id, wallet_address, display_name FROM users');
    const userMap = {};
    usersResult.rows.forEach(u => {
      userMap[u.display_name] = u.id;
    });
    
    // Create creators
    console.log('Creating creator profiles...');
    const creators = await pool.query(`
      INSERT INTO creators (user_id, wallet_address, category, bio, social_links, is_verified, is_featured, subscriber_count, total_earnings)
      VALUES 
        ($1, 'GDEMO1CREATORADDRESS001234567890ABCDEFGHIJK', 'Art & Design', 'I create digital art and share exclusive content with my supporters.', '{"twitter": "@alexcreator", "instagram": "@alexart"}', true, true, 0, 0),
        ($2, 'GDEMO2CREATORADDRESS001234567890ABCDEFGHIJK', 'Music', 'Independent musician sharing unreleased tracks, behind-the-scenes content, and exclusive merch discounts.', '{"twitter": "@sarahmusic", "spotify": "sarahmusic"}', true, true, 0, 0),
        ($3, 'GDEMO3CREATORADDRESS001234567890ABCDEFGHIJK', 'Education', 'Web3 tutorials, coding streams, and exclusive course content for blockchain developers.', '{"twitter": "@techtuts", "youtube": "@techtutorials"}', false, false, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id, category
    `, [userMap['Alex Creator'], userMap['Sarah Music'], userMap['Tech Tutorials']]);
    console.log(`  ✓ Created ${creators.rowCount} creators\n`);
    
    // Get creator IDs
    const creatorsResult = await pool.query('SELECT c.id, u.display_name FROM creators c JOIN users u ON c.user_id = u.id');
    const creatorMap = {};
    creatorsResult.rows.forEach(c => {
      creatorMap[c.display_name] = c.id;
    });
    
    // Create subscription tiers
    console.log('Creating subscription tiers...');
    const tiers = await pool.query(`
      INSERT INTO tiers (creator_id, name, description, price_xlm, benefits, is_active)
      VALUES 
        -- Alex Creator tiers
        ($1, 'Supporter', 'Basic support tier', 5.00, '["Early access to new artwork", "Supporter badge on profile"]', true),
        ($1, 'Patron', 'Enhanced support with more perks', 15.00, '["All Supporter benefits", "Monthly exclusive digital art", "Vote on next art piece"]', true),
        ($1, 'VIP Collector', 'Top tier for dedicated collectors', 50.00, '["All Patron benefits", "1-on-1 monthly call", "Physical prints quarterly", "Name in credits"]', true),
        
        -- Sarah Music tiers
        ($2, 'Fan', 'Support my music journey', 3.00, '["Exclusive behind-the-scenes content", "Fan badge"]', true),
        ($2, 'Super Fan', 'Get closer to the music', 10.00, '["All Fan benefits", "Unreleased tracks monthly", "Lyrics and stories"]', true),
        ($2, 'Inner Circle', 'Be part of my creative process', 30.00, '["All Super Fan benefits", "Live listening sessions", "Merch discounts", "Credits on albums"]', true),
        
        -- Tech Tutorials tiers
        ($3, 'Student', 'Access to basic tutorials', 5.00, '["Weekly tutorials", "Community Discord access"]', true),
        ($3, 'Developer', 'Full course access', 20.00, '["All Student benefits", "Full course library", "Code repositories", "Monthly Q&A"]', true),
        ($3, 'Pro', 'Personalized learning', 75.00, '["All Developer benefits", "1-on-1 mentoring sessions", "Job referrals", "Priority support"]', true)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, [creatorMap['Alex Creator'], creatorMap['Sarah Music'], creatorMap['Tech Tutorials']]);
    console.log(`  ✓ Created ${tiers.rowCount} subscription tiers\n`);
    
    console.log('✅ Database seeded successfully!\n');
    console.log('Sample accounts:');
    console.log('  Creators:');
    console.log('    - Alex Creator (Art & Design) - Verified, Featured');
    console.log('    - Sarah Music (Music) - Verified, Featured');
    console.log('    - Tech Tutorials (Education)');
    console.log('  Subscribers:');
    console.log('    - John Supporter');
    console.log('    - Emily Fan\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
