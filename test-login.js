require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./config/prisma');

async function testLogin() {
  try {
    const username = 'admin';
    const password = 'admin123';
    
    console.log('🧪 Testing login flow...\n');
    console.log(`Attempting to login with:`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}\n`);
    
    // Find user
    console.log('Step 1: Finding user...');
    const user = await prisma.user.findFirst({
      where: {
        username,
        isActive: true
      }
    });

    if (!user) {
      console.log('❌ User not found or not active');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    console.log(`   Password hash: ${user.passwordHash.substring(0, 30)}...\n`);

    // Verify password
    console.log('Step 2: Verifying password...');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`   bcrypt.compare result: ${isMatch}`);
    
    if (!isMatch) {
      console.log('❌ Password does not match!');
      console.log('\nDebugging info:');
      console.log(`   Input password: "${password}"`);
      console.log(`   Stored hash: ${user.passwordHash}`);
      
      // Try generating a new hash and comparing
      console.log('\n   Testing hash generation...');
      const testHash = await bcrypt.hash(password, 10);
      console.log(`   Newly generated hash: ${testHash}`);
      const testMatch = await bcrypt.compare(password, testHash);
      console.log(`   New hash matches: ${testMatch}`);
      
      return;
    }
    
    console.log('✅ Password matches!\n');
    console.log('🎉 Login would succeed!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
