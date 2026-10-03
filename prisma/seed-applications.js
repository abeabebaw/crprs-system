require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedApplications() {
  console.log('🌱 Seeding sample applications...\n');

  try {
    // Get FDO user ID
    const fdoUser = await prisma.user.findUnique({
      where: { username: 'fdo' }
    });

    if (!fdoUser) {
      console.error('❌ FDO user not found. Run seed.js first.');
      process.exit(1);
    }

    // Get some parcels
    const parcels = await prisma.parcel.findMany({ take: 5 });

    if (parcels.length === 0) {
      console.error('❌ No parcels found. Run seed-parcels.js first.');
      process.exit(1);
    }

    const sampleApplications = [
      {
        applicationNumber: 'APP-2026-000001',
        applicationType: 'FIRST_REGISTRATION',
        parcelId: parcels[0]?.id,
        status: 'READY_FOR_FILE_ATTACHMENT', // Ready for DO
        applicantName: 'Abebe Kebede',
        applicantType: 'LANDHOLDER',
        applicantAddress: 'Bole, Addis Ababa',
        applicantPhone: '+251911234567',
        applicantEmail: 'abebe.k@example.com',
        applicantIdNumber: 'AA-123456',
        applicantIdType: 'KEBELE_ID',
        description: 'First registration for residential property',
        submittedBy: fdoUser.id,
      },
      {
        applicationNumber: 'APP-2026-000002',
        applicationType: 'FIRST_REGISTRATION',
        parcelId: parcels[1]?.id,
        status: 'FILE_ATTACHMENT_FINISHED', // Ready for DO to digitize
        applicantName: 'Tigist Alemu',
        applicantType: 'LANDHOLDER',
        applicantAddress: 'Kirkos, Addis Ababa',
        applicantPhone: '+251922345678',
        applicantEmail: 'tigist.a@example.com',
        applicantIdNumber: 'AA-234567',
        applicantIdType: 'KEBELE_ID',
        description: 'Commercial property registration',
        submittedBy: fdoUser.id,
      },
      {
        applicationNumber: 'APP-2026-000003',
        applicationType: 'SUBSEQUENT_REGISTRATION',
        parcelId: parcels[2]?.id,
        status: 'FILE_ATTACHMENT_FINISHED', // Ready for DO
        applicantName: 'Mulugeta Tadesse',
        applicantType: 'LANDHOLDER',
        applicantAddress: 'Yeka, Addis Ababa',
        applicantPhone: '+251933456789',
        applicantEmail: 'mulugeta.t@example.com',
        applicantIdNumber: 'AA-345678',
        applicantIdType: 'DRIVING_LICENSE',
        description: 'Property transfer registration',
        submittedBy: fdoUser.id,
      },
      {
        applicationNumber: 'APP-2026-000004',
        applicationType: 'FIRST_REGISTRATION',
        parcelId: parcels[3]?.id,
        status: 'IN_PROGRESS', // DO is working on this
        applicantName: 'Hanna Girma',
        applicantType: 'LANDHOLDER',
        applicantAddress: 'Adama, Oromia',
        applicantPhone: '+251944567890',
        applicantEmail: 'hanna.g@example.com',
        applicantIdNumber: 'OR-456789',
        applicantIdType: 'KEBELE_ID',
        description: 'Industrial land registration',
        submittedBy: fdoUser.id,
      },
      {
        applicationNumber: 'APP-2026-000005',
        applicationType: 'FIRST_REGISTRATION',
        parcelId: parcels[4]?.id,
        status: 'SUBMITTED',
        applicantName: 'Solomon Haile',
        applicantType: 'LANDHOLDER',
        applicantAddress: 'Arada, Addis Ababa',
        applicantPhone: '+251955678901',
        applicantEmail: 'solomon.h@example.com',
        applicantIdNumber: 'AA-567890',
        applicantIdType: 'PASSPORT',
        description: 'Residential land first registration',
        submittedBy: fdoUser.id,
      },
    ];

    for (const app of sampleApplications) {
      const existingApp = await prisma.application.findUnique({
        where: { applicationNumber: app.applicationNumber }
      });

      if (!existingApp) {
        const createdApp = await prisma.application.create({
          data: app
        });

        // Create application history
        await prisma.applicationHistory.create({
          data: {
            applicationId: createdApp.id,
            toStatus: app.status,
            changedBy: fdoUser.id,
          }
        });

        console.log(`✅ Created: ${app.applicationNumber} - ${app.applicantName} (Status: ${app.status})`);
      } else {
        console.log(`⏭️  Skipped: ${app.applicationNumber} (already exists)`);
      }
    }

    console.log('\n🎉 Application seeding completed!\n');
    console.log('📋 Summary:');
    console.log('   - Applications ready for DO: 3');
    console.log('   - Applications in progress: 1');
    console.log('   - Applications submitted: 1');
    console.log('\n💡 Login as DO (username: do, password: do123) to see these applications.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedApplications();
