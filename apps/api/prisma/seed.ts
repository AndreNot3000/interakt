/**
 * Prisma Database Seed
 *
 * Seeds the database with:
 * - A super admin account
 * - A sample institution
 * - Sample academic structure (Faculty → Department → Programme → Courses)
 *
 * Run with: npm run db:seed
 */

import { PrismaClient, UserRole, VerificationMethod } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================
  // SUPER ADMIN
  // ============================================================
  const superAdminEmail = process.env.ADMIN_SEED_EMAIL ?? 'superadmin@interakt.app';
  const superAdminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Change_This_Password_123!';

  // Create a platform institution for the super admin
  const platformInstitution = await prisma.institution.upsert({
    where: { slug: 'interakt-platform' },
    update: {},
    create: {
      name: 'Interakt Platform',
      slug: 'interakt-platform',
      shortName: 'IAKT',
      country: 'Global',
      status: 'ACTIVE',
      verificationMethod: 'ADMIN_APPROVAL',
    },
  });

  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email_institutionId: { email: superAdminEmail, institutionId: platformInstitution.id } },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      verificationStatus: 'VERIFIED',
      institutionId: platformInstitution.id,
      profile: {
        create: {
          firstName: 'Super',
          lastName: 'Admin',
          displayName: 'Platform Admin',
        },
      },
    },
  });

  console.log(`✅ Super admin created: ${superAdmin.email}`);

  // ============================================================
  // SAMPLE INSTITUTION
  // ============================================================
  const sampleInstitution = await prisma.institution.upsert({
    where: { slug: 'university-of-lagos' },
    update: {},
    create: {
      name: 'University of Lagos',
      slug: 'university-of-lagos',
      shortName: 'UNILAG',
      description: 'The University of Lagos, founded in 1962, is one of the foremost universities in Nigeria.',
      country: 'Nigeria',
      city: 'Lagos',
      email: 'info@unilag.edu.ng',
      websiteUrl: 'https://unilag.edu.ng',
      status: 'ACTIVE',
      verificationMethod: VerificationMethod.EMAIL_DOMAIN,
      allowedEmailDomains: ['student.unilag.edu.ng', 'unilag.edu.ng'],
    },
  });

  console.log(`✅ Sample institution created: ${sampleInstitution.name}`);

  // ============================================================
  // ACADEMIC STRUCTURE — Faculty of Science
  // ============================================================
  const facultyOfScience = await prisma.faculty.upsert({
    where: { institutionId_name: { institutionId: sampleInstitution.id, name: 'Faculty of Science' } },
    update: {},
    create: {
      institutionId: sampleInstitution.id,
      name: 'Faculty of Science',
      shortName: 'SCI',
      description: 'The Faculty of Science offers programmes in the natural sciences.',
    },
  });

  const deptCS = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: facultyOfScience.id, name: 'Department of Computer Science' } },
    update: {},
    create: {
      institutionId: sampleInstitution.id,
      facultyId: facultyOfScience.id,
      name: 'Department of Computer Science',
      shortName: 'CSC',
      description: 'Computer Science, Artificial Intelligence, and Information Systems.',
    },
  });

  const progCS = await prisma.programme.upsert({
    where: { departmentId_name: { departmentId: deptCS.id, name: 'B.Sc. Computer Science' } },
    update: {},
    create: {
      institutionId: sampleInstitution.id,
      departmentId: deptCS.id,
      name: 'B.Sc. Computer Science',
      shortName: 'BSC-CS',
      durationYears: 4,
    },
  });

  // Sample Courses
  const sampleCourses = [
    { code: 'CSC 101', name: 'Introduction to Computing', level: 100, semester: 1, units: 3 },
    { code: 'CSC 201', name: 'Data Structures', level: 200, semester: 1, units: 3 },
    { code: 'CSC 301', name: 'Algorithm Design and Analysis', level: 300, semester: 1, units: 3 },
    { code: 'CSC 302', name: 'Operating Systems', level: 300, semester: 2, units: 3 },
    { code: 'CSC 401', name: 'Software Engineering', level: 400, semester: 1, units: 3 },
  ];

  for (const courseData of sampleCourses) {
    await prisma.course.upsert({
      where: { institutionId_code: { institutionId: sampleInstitution.id, code: courseData.code } },
      update: {},
      create: {
        institutionId: sampleInstitution.id,
        programmeId: progCS.id,
        ...courseData,
      },
    });
  }

  console.log(`✅ Academic structure seeded for ${sampleInstitution.name}`);

  // ============================================================
  // FACULTY OF ENGINEERING
  // ============================================================
  const facultyOfEng = await prisma.faculty.upsert({
    where: { institutionId_name: { institutionId: sampleInstitution.id, name: 'Faculty of Engineering' } },
    update: {},
    create: {
      institutionId: sampleInstitution.id,
      name: 'Faculty of Engineering',
      shortName: 'ENG',
    },
  });

  const deptEE = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: facultyOfEng.id, name: 'Department of Electrical Engineering' } },
    update: {},
    create: {
      institutionId: sampleInstitution.id,
      facultyId: facultyOfEng.id,
      name: 'Department of Electrical Engineering',
      shortName: 'EEE',
    },
  });

  console.log(`✅ Additional faculty & department seeded`);
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n--- Credentials ---');
  console.log(`Super Admin Email: ${superAdminEmail}`);
  console.log(`Super Admin Password: ${superAdminPassword}`);
  console.log(`Sample Institution: ${sampleInstitution.name} (ID: ${sampleInstitution.id})`);
  console.log('-------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
