require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedParcels() {
  console.log('🌱 Seeding sample parcels...\n');

  const sampleParcels = [
    {
      parcelCode: 'PRC-2026-000001',
      areaSqm: 500.50,
      landUse: 'Residential',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      subCity: 'Bole',
      woreda: '03',
      isRegistered: true,
      registrationDate: new Date('2024-01-15')
    },
    {
      parcelCode: 'PRC-2026-000002',
      areaSqm: 1200.00,
      landUse: 'Commercial',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      subCity: 'Kirkos',
      woreda: '08',
      isRegistered: true,
      registrationDate: new Date('2024-02-20')
    },
    {
      parcelCode: 'PRC-2026-000003',
      areaSqm: 750.75,
      landUse: 'Residential',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      subCity: 'Yeka',
      woreda: '12',
      isRegistered: true,
      registrationDate: new Date('2024-03-10')
    },
    {
      parcelCode: 'PRC-2026-000004',
      areaSqm: 2500.00,
      landUse: 'Industrial',
      region: 'Oromia',
      city: 'Adama',
      subCity: 'Zone 1',
      woreda: '05',
      isRegistered: true,
      registrationDate: new Date('2024-04-05')
    },
    {
      parcelCode: 'PRC-2026-000005',
      areaSqm: 450.25,
      landUse: 'Residential',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      subCity: 'Arada',
      woreda: '02',
      isRegistered: false
    }
  ];

  for (const parcel of sampleParcels) {
    await prisma.parcel.upsert({
      where: { parcelCode: parcel.parcelCode },
      update: {},
      create: parcel
    });
  }

  console.log('✅ Sample parcels created:');
  sampleParcels.forEach(p => {
    console.log(`   - ${p.parcelCode}: ${p.areaSqm}m² in ${p.subCity}, ${p.city}`);
  });
  
  console.log('\n🎉 Parcel seeding completed!\n');
}

seedParcels()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
