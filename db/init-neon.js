require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

async function initDatabase() {
  console.log('🔧 Initializing Neon Database...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL not found in .env file');
    console.log('\n📝 Please add your Neon connection string to .env:');
    console.log('   DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('✅ Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connection successful!\n');

    // Read schema file
    console.log('📄 Reading schema file...');
    const schema = fs.readFileSync('./db/schema.sql', 'utf8');
    
    // Execute schema
    console.log('🚀 Creating tables and inserting default data...');
    await pool.query(schema);
    
    console.log('\n✅ Database initialized successfully!');
    console.log('\n👤 Default users created:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   FDO: username=fdo, password=fdo123');
    console.log('\n🎉 You can now start the server with: npm start\n');

  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    if (err.detail) console.error('Details:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
