require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create default lookup types
  console.log('📋 Creating lookup types...');
  const lookupTypes = [
    { typeName: 'ACQUISITION_TYPE', description: 'Types of property acquisition' },
    { typeName: 'LAND_USE', description: 'Land use categories' },
    { typeName: 'DOCUMENT_TYPE', description: 'Document types' },
    { typeName: 'ORGANIZATION_TYPE', description: 'Organization types' },
    { typeName: 'SERVITUDE_TYPE', description: 'Types of servitude' },
  ];

  for (const type of lookupTypes) {
    await prisma.lookupType.upsert({
      where: { typeName: type.typeName },
      update: {},
      create: type,
    });
  }
  console.log('✅ Lookup types created\n');

  // Create default users
  console.log('👤 Creating default users...');
  
  const adminPassword = await bcrypt.hash('admin123', 10);
  const fdoPassword = await bcrypt.hash('fdo123', 10);
  const doPassword = await bcrypt.hash('do123', 10);
  const roPassword = await bcrypt.hash('ro123', 10);
  const sroPassword = await bcrypt.hash('sro123', 10);
  const goPassword = await bcrypt.hash('go123', 10);
  const sgoPassword = await bcrypt.hash('sgo123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@crprs.gov.et',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'fdo' },
    update: {},
    create: {
      username: 'fdo',
      email: 'fdo@crprs.gov.et',
      passwordHash: fdoPassword,
      fullName: 'Front Desk Officer',
      role: 'FDO',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'do' },
    update: {},
    create: {
      username: 'do',
      email: 'do@crprs.gov.et',
      passwordHash: doPassword,
      fullName: 'Digitizing Officer',
      role: 'DO',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'ro' },
    update: {},
    create: {
      username: 'ro',
      email: 'ro@crprs.gov.et',
      passwordHash: roPassword,
      fullName: 'Registration Officer',
      role: 'RO',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'sro' },
    update: {},
    create: {
      username: 'sro',
      email: 'sro@crprs.gov.et',
      passwordHash: sroPassword,
      fullName: 'Senior Registration Officer',
      role: 'SRO',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'go' },
    update: {},
    create: {
      username: 'go',
      email: 'go@crprs.gov.et',
      passwordHash: goPassword,
      fullName: 'GIS Officer',
      role: 'GO',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'sgo' },
    update: {},
    create: {
      username: 'sgo',
      email: 'sgo@crprs.gov.et',
      passwordHash: sgoPassword,
      fullName: 'Senior GIS Officer',
      role: 'SGO',
      isActive: true,
    },
  });

  // Seed sample Announcements
  console.log('📢 Seeding announcements...');
  const announcements = [
    {
      title: 'Digital Land Registration Portal Launched',
      content: 'The Ministry of Urban Development and Construction has officially launched the Cadastre & Real Property Registration System (CRPRS) Release 2.2.',
      category: 'PRESS_RELEASE',
      isPublished: true
    },
    {
      title: 'Public Notice on First Registration Deadlines',
      content: 'All landholders in Addis Ababa sub-cities are requested to verify their parcel cadastral identifiers before the end of the fiscal quarter.',
      category: 'PUBLIC_NOTICE',
      isPublished: true
    }
  ];

  for (const ann of announcements) {
    const existing = await prisma.announcement.findFirst({ where: { title: ann.title } });
    if (!existing) {
      await prisma.announcement.create({ data: ann });
    }
  }

  // Seed sample Services
  console.log('📑 Seeding public services...');
  const services = [
    {
      serviceName: 'First Registration of Landholding',
      description: 'Registration of initial real property titles and cadastral boundaries.',
      feeAmount: 500.00,
      processingTimeHours: 72
    },
    {
      serviceName: 'Mortgage Registration & Inscription',
      description: 'Legal registration of financial mortgage agreements against parcels.',
      feeAmount: 1200.00,
      processingTimeHours: 48
    },
    {
      serviceName: 'Cadastral Extract & Title Certificate',
      description: 'Issuance of official cadastral map extracts and property title certificates.',
      feeAmount: 250.00,
      processingTimeHours: 24
    }
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { serviceName: s.serviceName } });
    if (!existing) {
      await prisma.service.create({ data: s });
    }
  }

  console.log('✅ Default users & master data seeded successfully');
  console.log('   Admin: username=admin, password=admin123');
  console.log('   FDO:   username=fdo, password=fdo123');
  console.log('   DO:    username=do, password=do123');
  console.log('   RO:    username=ro, password=ro123');
  console.log('   SRO:   username=sro, password=sro123');
  console.log('   GO:    username=go, password=go123');
  console.log('   SGO:   username=sgo, password=sgo123\n');
  
  console.log('🎉 Seeding completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
