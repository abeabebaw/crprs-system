require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        passwordHash: true
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }

    console.log(`✅ Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Password Hash: ${user.passwordHash.substring(0, 20)}...`);
      
      // Test password verification
      const testPasswords = {
        'admin': 'admin123',
        'fdo': 'fdo123',
        'do': 'do123',
        'ro': 'ro123',
        'sro': 'sro123'
      };
      
      const expectedPassword = testPasswords[user.username];
      if (expectedPassword) {
        const isMatch = await bcrypt.compare(expectedPassword, user.passwordHash);
        console.log(`  Password "${expectedPassword}" matches: ${isMatch ? '✅ YES' : '❌ NO'}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkUsers();
