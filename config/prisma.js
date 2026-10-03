const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = (() => {
  if (!process.env.DATABASE_URL) return undefined;

  const url = new URL(process.env.DATABASE_URL);
  if (url.searchParams.get('sslmode') === 'require') {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
})();
const poolOptions = {
  connectionString,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 60000, // Close idle clients after 60 seconds
  connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection not established
  keepAlive: true,
  keepAliveInitialDelayMillis: 0, // Start keepalive immediately
  // Add statement timeout (Neon has a default timeout of 60 seconds for pooled connections)
  statement_timeout: 50000, // 50 seconds - less than Neon's timeout
  query_timeout: 50000, // 50 seconds
};

// Let sslmode in DATABASE_URL control remote database TLS settings.
if (process.env.DB_SSL === 'true') {
  poolOptions.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolOptions);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Retry pool connection on startup
pool.on('connect', (client) => {
  console.log('✅ New database client connected to pool');
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Test connection periodically to keep pool alive
// Neon pooler has a 5-minute idle timeout, so we ping more frequently
let keepAliveInterval = setInterval(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (err) {
    console.error('❌ Keep-alive query failed:', err.message);
    // Try to recreate connections if they're timing out
  }
}, 20000); // Every 20 seconds
keepAliveInterval.unref();

// Handle graceful shutdown
process.on('beforeExit', async () => {
  clearInterval(keepAliveInterval);
  await prisma.$disconnect();
  await pool.end();
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  clearInterval(keepAliveInterval);
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  clearInterval(keepAliveInterval);
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

module.exports = prisma;
