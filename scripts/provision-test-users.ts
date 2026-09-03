// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const institute = await prisma.institute.findFirst();
  if (!institute) {
    console.log("No institute found");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Ensure Faculty user exists: faculty@vidyalaya.test
  const facultyUser = await prisma.user.upsert({
    where: { email: "faculty@vidyalaya.test" },
    update: {
      role: "FACULTY",
      password: passwordHash,
      instituteId: institute.id,
    },
    create: {
      name: "Dr. R. Sharma (Physics Faculty)",
      email: "faculty@vidyalaya.test",
      password: passwordHash,
      role: "FACULTY",
      instituteId: institute.id,
    },
  });

  // Link to a faculty record
  await prisma.faculty.upsert({
    where: { id: "seed-faculty-sharma" },
    update: {
      userId: facultyUser.id,
      hasSystemAccess: true,
      roleType: "FACULTY",
      department: "ACADEMIC",
      designation: "Senior Physics Faculty",
    },
    create: {
      id: "seed-faculty-sharma",
      instituteId: institute.id,
      name: "Dr. R. Sharma",
      email: "faculty@vidyalaya.test",
      mobile: "9876500001",
      subject: "Physics",
      qualification: "Ph.D. Physics",
      experienceYears: 12,
      roleType: "FACULTY",
      department: "ACADEMIC",
      designation: "Senior Physics Faculty",
      hasSystemAccess: true,
      userId: facultyUser.id,
      monthlySalary: 75000,
    },
  });

  // 2. Ensure Counsellor user exists: counsellor@vidyalaya.test
  await prisma.user.upsert({
    where: { email: "counsellor@vidyalaya.test" },
    update: {
      role: "COUNSELLOR",
      password: passwordHash,
      instituteId: institute.id,
    },
    create: {
      name: "Priya Sharma (Counsellor)",
      email: "counsellor@vidyalaya.test",
      password: passwordHash,
      role: "COUNSELLOR",
      instituteId: institute.id,
    },
  });

  // 3. Ensure Accountant user exists: accountant@vidyalaya.test
  await prisma.user.upsert({
    where: { email: "accountant@vidyalaya.test" },
    update: {
      role: "ACCOUNTANT",
      password: passwordHash,
      instituteId: institute.id,
    },
    create: {
      name: "Amit Gupta (Accounts)",
      email: "accountant@vidyalaya.test",
      password: passwordHash,
      role: "ACCOUNTANT",
      instituteId: institute.id,
    },
  });

  console.log("Credentials provisioned successfully!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
