import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Ensure student@vidyalaya.test exists and is active
  const vidyalayaInstitute = await prisma.institute.findFirst({
    where: { email: "owner@vidyalaya.test" },
  });

  if (vidyalayaInstitute) {
    const existingStudentUser = await prisma.user.findUnique({
      where: { email: "student@vidyalaya.test" },
    });
    if (!existingStudentUser) {
      await prisma.user.create({
        data: {
          instituteId: vidyalayaInstitute.id,
          name: "Aarav Sharma (Student)",
          email: "student@vidyalaya.test",
          password: passwordHash,
          role: "STUDENT",
        },
      });
      console.log("Created student@vidyalaya.test user");
    } else {
      // Update password to password123 to be 100% sure
      await prisma.user.update({
        where: { email: "student@vidyalaya.test" },
        data: { password: passwordHash },
      });
      console.log("Updated student@vidyalaya.test password to password123");
    }

    // Ensure student record exists with mobile 9876543210 and email student@vidyalaya.test
    const existingStudent = await prisma.student.findFirst({
      where: { email: "student@vidyalaya.test" },
    });
    if (!existingStudent) {
      const course = await prisma.course.findFirst({ where: { instituteId: vidyalayaInstitute.id } });
      const batch = await prisma.batch.findFirst({ where: { instituteId: vidyalayaInstitute.id } });
      if (course) {
        await prisma.student.create({
          data: {
            instituteId: vidyalayaInstitute.id,
            name: "Aarav Sharma",
            mobile: "9876543210",
            email: "student@vidyalaya.test",
            courseId: course.id,
            batchId: batch?.id ?? undefined,
            status: "ACTIVE",
            totalFee: 50000,
            paidFee: 30000,
          },
        });
        console.log("Created student record for Aarav Sharma");
      } else {
        console.log("No course found — skipped creating student record for Aarav Sharma");
      }
    }
  }

  // Also for Sarthak Coaching institutes: if they have students, create a student user for them too!
  const sarthakInstitute = await prisma.institute.findFirst({
    where: { OR: [{ email: "yogesh.invent@gmail.com" }, { email: "yadavsarthak2409@gmail.com" }] },
  });
  if (sarthakInstitute) {
    const sarthakStudentUser = await prisma.user.findUnique({
      where: { email: "student.sarthak@vidyalaya.test" },
    });
    if (!sarthakStudentUser) {
      await prisma.user.create({
        data: {
          instituteId: sarthakInstitute.id,
          name: "Rohit Verma (Student)",
          email: "student.sarthak@vidyalaya.test",
          password: passwordHash,
          role: "STUDENT",
        },
      });
    }
    const sarthakStudent = await prisma.student.findFirst({
      where: { email: "student.sarthak@vidyalaya.test" },
    });
    if (!sarthakStudent) {
      const course = await prisma.course.findFirst({ where: { instituteId: sarthakInstitute.id } });
      const batch = await prisma.batch.findFirst({ where: { instituteId: sarthakInstitute.id } });
      if (course) {
        await prisma.student.create({
          data: {
            instituteId: sarthakInstitute.id,
            name: "Rohit Verma",
            mobile: "9812345678",
            email: "student.sarthak@vidyalaya.test",
            courseId: course.id,
            batchId: batch?.id ?? undefined,
            status: "ACTIVE",
            totalFee: 45000,
            paidFee: 45000,
          },
        });
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
