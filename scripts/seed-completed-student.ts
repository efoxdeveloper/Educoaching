import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Looking up institute for owner@vidyalaya.test...");

  // Same lookup pattern as seed: find user then institute
  const ownerUser = await prisma.user.findFirst({
    where: { email: "owner@vidyalaya.test" },
  });

  if (!ownerUser) {
    throw new Error('User with email "owner@vidyalaya.test" not found');
  }

  if (!ownerUser.instituteId) {
    throw new Error("Owner user has no instituteId");
  }

  const institute = await prisma.institute.findUnique({
    where: { id: ownerUser.instituteId },
  });

  if (!institute) {
    throw new Error(`Institute with id ${ownerUser.instituteId} not found`);
  }

  console.log(`Found institute: ${institute.id} (${institute.name}) for owner user ${ownerUser.id}`);

  // Ensure CertificateTemplate exists
  let template = await prisma.certificateTemplate.findFirst({
    where: { instituteId: institute.id },
  });

  if (!template) {
    console.log("No CertificateTemplate found — creating one...");
    template = await prisma.certificateTemplate.create({
      data: {
        instituteId: institute.id,
        name: "Default Completion Certificate",
        title: "Certificate of Completion",
        bodyText:
          "This is to certify that {studentName} has successfully completed the course {courseName} on {completionDate} at {instituteName}.",
        signatoryName: "Authorized Signatory",
        signatoryTitle: "Director / Academic Head",
      },
    });
    console.log(`Created template: ${template.id}`);
  } else {
    console.log(`Found existing template: ${template.id} (${template.name})`);
  }

  // Find seeded student Aarav Sharma mobile 9876543210 email student@vidyalaya.test
  let student = await prisma.student.findFirst({
    where: {
      instituteId: institute.id,
      name: "Aarav Sharma",
      mobile: "9876543210",
    },
  });

  if (!student) {
    console.log('Seeded student "Aarav Sharma" with mobile 9876543210 not found, trying by email...');
    student = await prisma.student.findFirst({
      where: {
        instituteId: institute.id,
        email: "student@vidyalaya.test",
      },
    });
  }

  if (!student) {
    console.log("Aarav Sharma not found — falling back to any ACTIVE student under this institute...");
    student = await prisma.student.findFirst({
      where: {
        instituteId: institute.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!student) {
    throw new Error("No ACTIVE student found under this institute");
  }

  console.log(`Found student: ${student.id} (${student.name}) mobile=${student.mobile} email=${student.email} branchId=${student.branchId}`);

  // Check if already has certificate issued for this template (should not create, but log)
  const existingIssued = await prisma.certificateIssued.findFirst({
    where: {
      templateId: template.id,
      studentId: student.id,
    },
  });

  if (existingIssued) {
    console.log(`Student already has CertificateIssued ${existingIssued.id} for this template — will keep as is but updating courseEndDate anyway`);
  } else {
    console.log("Student has no certificate yet — eligible but not yet certified (as desired)");
  }

  // Update courseEndDate to yesterday, courseDuration sensible if null
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // Set to noon to avoid timezone edge
  yesterday.setHours(12, 0, 0, 0);

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: {
      courseEndDate: yesterday,
      courseDuration: student.courseDuration || "6 months",
    },
  });

  console.log(`Updated student courseEndDate to ${updated.courseEndDate?.toISOString()} and courseDuration to "${updated.courseDuration}"`);

  console.log("\n=== SUMMARY ===");
  console.log(`Institute ID: ${institute.id}`);
  console.log(`Template ID: ${template.id} (name: ${template.name})`);
  console.log(`Student ID: ${student.id} (${updated.name})`);
  console.log(`CourseEndDate: ${updated.courseEndDate?.toISOString()}`);
  console.log("Student should now appear in GET /api/certificates/eligible-students with hasCertificate: false");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
