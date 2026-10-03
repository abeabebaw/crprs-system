require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function addDOUser() {
  console.log('Adding Digitizing Officer user...\n');

  const doPassword = await bcrypt.hash('do123', 10);

  try {
    const user = await prisma.user.upsert({
      where: { username: 'do' },
      update: {
        passwordHash: doPassword,
        isActive: true
      },
      create: {
        username: 'do',
        email: 'do@crprs.gov.et',
        passwordHash: doPassword,
        fullName: 'Digitizing Officer',
        role: 'DO',
        isActive: true,
      },
    });

    console.log('✅ DO user created/updated successfully!');
    console.log('   Username: do');
    console.log('   Password: do123');
    console.log('   Role: DO (Digitizing Officer)\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addDOUser();
