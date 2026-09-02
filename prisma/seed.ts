import { PrismaClient, StudentStatus, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, addDays } from "date-fns";

const prisma = new PrismaClient();

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditi", "Diya", "Kabir", "Ishaan", "Ananya", "Riya", "Rohan", "Saanvi", "Kartik", "Meera", "Arjun", "Priya", "Yash", "Neha", "Dev", "Tanvi", "Aryan", "Sneha"];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Yadav", "Mishra", "Chauhan"];

function randomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

function randomMobile() {
  return `9${Math.floor(100000000 + Math.random() * 899999999)}`;
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data (order matters due to FKs)
  await prisma.testResult.deleteMany();
  await prisma.test.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.facultyReview.deleteMany();
  await prisma.batchFaculty.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.renewal.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.course.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformNotification.deleteMany();
  await prisma.mobileOtp.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.institute.deleteMany();

  // Institute (tenant) - this is what used to be "the app"; now it's one
  // coaching institute among potentially many.
  const now = new Date();
  const institute = await prisma.institute.create({
    data: {
      name: "Vidyalaya Classes",
      ownerName: "Institute Owner",
      email: "owner@vidyalaya.test",
      mobile: randomMobile(),
      emailVerified: true,
      mobileVerified: true,
      billingCycle: "TRIAL",
      platformSubscriptionStatus: "TRIAL",
      trialStartedAt: now,
      trialEndsAt: addDays(now, 7),
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  // Institute owner login
  await prisma.user.create({
    data: {
      instituteId: institute.id,
      name: "Institute Owner",
      email: "owner@vidyalaya.test",
      password: passwordHash,
      role: "OWNER",
    },
  });

  // Platform admin login - belongs to no institute, sees all of them
  await prisma.user.create({
    data: {
      instituteId: null,
      name: "Platform Super Admin",
      email: "ecommerseinventiveteam@gmail.com",
      password: passwordHash,
      role: "PLATFORM_ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      instituteId: null,
      name: "Platform Admin",
      email: "admin@platform.test",
      password: passwordHash,
      role: "PLATFORM_ADMIN",
    },
  });

  // Student login
  await prisma.user.create({
    data: {
      instituteId: institute.id,
      name: "Aarav Sharma (Student)",
      email: "student@vidyalaya.test",
      password: passwordHash,
      role: "STUDENT",
    },
  });

  // Courses
  const courseNames = [
    { name: "JEE Main + Advanced", fee: 85000 },
    { name: "NEET Foundation", fee: 75000 },
    { name: "Class 10 Board Prep", fee: 30000 },
    { name: "Class 12 Board Prep", fee: 35000 },
    { name: "Spoken English", fee: 12000 },
  ];
  const courses = await Promise.all(
    courseNames.map((c) => prisma.course.create({ data: { ...c, instituteId: institute.id } }))
  );

  // Faculty
  const facultyData = [
    { name: "Dr. R. Sharma", subject: "Physics", qualification: "Ph.D. Physics", experienceYears: 12, email: "r.sharma@vidyalaya.test", mobile: randomMobile() },
    { name: "Ms. A. Kapoor", subject: "Chemistry", qualification: "M.Sc. Chemistry", experienceYears: 8, email: "a.kapoor@vidyalaya.test", mobile: randomMobile() },
    { name: "Mr. S. Iyer", subject: "Mathematics", qualification: "M.Sc. Mathematics", experienceYears: 15, email: "s.iyer@vidyalaya.test", mobile: randomMobile() },
    { name: "Mrs. P. Nair", subject: "Biology", qualification: "M.Sc. Biology", experienceYears: 10, email: "p.nair@vidyalaya.test", mobile: randomMobile() },
    { name: "Mr. K. Bansal", subject: "English", qualification: "M.A. English", experienceYears: 6, email: "k.bansal@vidyalaya.test", mobile: randomMobile() },
  ];
  const faculty = await Promise.all(
    facultyData.map((f) => prisma.faculty.create({ data: { ...f, instituteId: institute.id } }))
  );

  // Batches
  const timings = ["7:00 AM - 9:00 AM", "9:30 AM - 11:30 AM", "2:00 PM - 4:00 PM", "4:30 PM - 6:30 PM", "6:45 PM - 8:45 PM"];
  const batches = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = 0; j < 2; j++) {
      const batch = await prisma.batch.create({
        data: {
          instituteId: institute.id,
          name: `${courses[i].name.split(" ")[0]} Batch ${j === 0 ? "A" : "B"}`,
          courseId: courses[i].id,
          timing: timings[(i + j) % timings.length],
          capacity: 35,
          status: "Active",
          faculty: {
            create: [{ facultyId: faculty[(i + j) % faculty.length].id, instituteId: institute.id }],
          },
        },
      });
      batches.push(batch);
    }
  }

  // Students
  const students = [];
  for (let i = 0; i < 60; i++) {
    const course = courses[Math.floor(Math.random() * courses.length)];
    const courseBatches = batches.filter((b) => b.courseId === course.id);
    const batch = Math.random() > 0.1 ? courseBatches[Math.floor(Math.random() * courseBatches.length)] : null;
    const totalFee = Number(course.fee);
    const paidRatio = Math.random();
    const paidFee = paidRatio > 0.85 ? totalFee : Math.round(totalFee * paidRatio);
    const overdue = Math.random() > 0.75;
    const admissionDate = subDays(new Date(), Math.floor(Math.random() * 180));

    // ~15% of seeded students are on a 7-day free demo (SaaS-style trial), rest are paid monthly subscribers.
    const isDemo = i < 9; // first 9 students are demo enrollments
    const demoStartedAt = isDemo ? subDays(new Date(), Math.floor(Math.random() * 10)) : null; // some already expired, some still active
    const demoExpiresAt = demoStartedAt ? addDays(demoStartedAt, 7) : null;

    const periodAnchor = subDays(new Date(), Math.floor(Math.random() * 40)); // some already lapsed, some still active
    const currentPeriodEnd = !isDemo ? addDays(periodAnchor, 30) : null;

    const isFirstStudent = i === 0;
    const studentName = isFirstStudent ? "Aarav Sharma" : randomName();
    const studentMobile = isFirstStudent ? "9876543210" : randomMobile();
    const studentEmail = isFirstStudent ? "student@vidyalaya.test" : null;

    const student = await prisma.student.create({
      data: {
        instituteId: institute.id,
        name: studentName,
        mobile: studentMobile,
        email: studentEmail,
        parentMobile: randomMobile(),
        courseId: course.id,
        batchId: batch?.id ?? null,
        admissionDate,
        status: Math.random() > 0.9 ? StudentStatus.ON_HOLD : StudentStatus.ACTIVE,
        totalFee: isDemo ? 0 : totalFee,
        paidFee: isDemo ? 0 : paidFee,
        dueDate: overdue ? subDays(new Date(), Math.floor(Math.random() * 15) + 1) : subDays(new Date(), -30),
        plan: isDemo ? "DEMO" : "MONTHLY",
        subscriptionStatus: isDemo ? "TRIAL" : "ACTIVE",
        demoStartedAt,
        demoExpiresAt,
        currentPeriodEnd,
        monthlyAmount: isDemo ? null : Math.round(totalFee / 3), // rough monthly renewal reference amount
      },
    });
    students.push(student);
  }

  // Payments (history, tied to paid amounts) - skip demo students, they have no fee yet
  for (const s of students) {
    if (s.plan === "DEMO") continue;
    const paid = Number(s.paidFee);
    if (paid <= 0) continue;
    const installments = paid > 20000 ? 2 : 1;
    let remaining = paid;
    for (let k = 0; k < installments; k++) {
      const amount = k === installments - 1 ? remaining : Math.round(paid / installments);
      remaining -= amount;
      await prisma.payment.create({
        data: {
          instituteId: institute.id,
          studentId: s.id,
          amount,
          method: ["Cash", "UPI", "Card", "Bank Transfer"][Math.floor(Math.random() * 4)],
          paidAt: subDays(new Date(), Math.floor(Math.random() * 30)),
        },
      });
    }
  }

  // Attendance for last 14 days for batch-assigned students
  const statuses: AttendanceStatus[] = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"];
  const assignedStudents = students.filter((s) => s.batchId);
  for (let d = 0; d < 14; d++) {
    const date = subDays(new Date(), d);
    date.setHours(0, 0, 0, 0);
    for (const s of assignedStudents) {
      // Skip some days randomly to simulate not-yet-marked
      if (d > 0 && Math.random() > 0.85) continue;
      await prisma.attendance.create({
        data: {
          instituteId: institute.id,
          studentId: s.id,
          batchId: s.batchId!,
          date,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        },
      });
    }
  }

  // A handful of sample faculty reviews so the Faculty page isn't empty
  const reviewComments = [
    "Explains concepts very clearly, doubts get resolved quickly.",
    "Good teacher but sometimes goes a bit fast.",
    "Very supportive and patient with weaker students.",
    "Makes the subject genuinely interesting.",
    "Strict about attendance but fair in grading.",
  ];
  const reviewedStudents = students.filter((s) => s.batchId).slice(0, 20);
  for (const s of reviewedStudents) {
    const batch = batches.find((b) => b.id === s.batchId);
    if (!batch) continue;
    const link = await prisma.batchFaculty.findFirst({ where: { batchId: batch.id } });
    if (!link) continue;
    await prisma.facultyReview.create({
      data: {
        instituteId: institute.id,
        facultyId: link.facultyId,
        studentId: s.id,
        rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
      },
    });
  }

  // Branches
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: "Main Campus (North)",
        city: "Delhi",
        state: "Delhi",
        address: "Block B, Model Town",
        contact: randomMobile(),
      },
    }),
    prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: "South Extension Branch",
        city: "Delhi",
        state: "Delhi",
        address: "Ring Road, South Ext 1",
        contact: randomMobile(),
      },
    }),
  ]);

  // Admissions (pipeline of applicants)
  const admissionStatuses = ["PENDING", "APPROVED", "ENROLLED", "REJECTED"] as const;
  const sampleNotes = [
    "Interested in weekend batches, visited with parents.",
    "Requested 10% sibling discount, demo class attended.",
    "Transferred from another institute, strong academic background.",
    "Awaiting Class 10 board exam marksheet verification.",
    "Enrolled after attending 2 demo sessions.",
    "Scholarship test appeared, scored 85%.",
  ];

  const admissions = [];
  for (let i = 0; i < 24; i++) {
    const course = courses[Math.floor(Math.random() * courses.length)];
    const courseBatches = batches.filter((b) => b.courseId === course.id);
    const batch = courseBatches.length > 0 ? courseBatches[Math.floor(Math.random() * courseBatches.length)] : null;
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const status = admissionStatuses[Math.floor(Math.random() * admissionStatuses.length)];

    const adm = await prisma.admission.create({
      data: {
        instituteId: institute.id,
        applicantName: randomName(),
        mobile: randomMobile(),
        email: `applicant${i + 1}@example.test`,
        courseId: course.id,
        batchId: batch?.id ?? null,
        branchId: branch.id,
        feePlan: Number(course.fee),
        status,
        note: sampleNotes[Math.floor(Math.random() * sampleNotes.length)],
        createdAt: subDays(new Date(), Math.floor(Math.random() * 60)),
      },
    });
    admissions.push(adm);
  }

  // Tests and Test Results
  const testSubjects = ["Physics", "Chemistry", "Mathematics", "Biology", "English"];
  const tests = [];

  for (const b of batches.slice(0, 6)) {
    for (let t = 0; t < 2; t++) {
      const subject = testSubjects[Math.floor(Math.random() * testSubjects.length)];
      const totalMarks = [50, 100, 75][t % 3];
      const passingMarks = Math.round(totalMarks * 0.35);

      const test = await prisma.test.create({
        data: {
          instituteId: institute.id,
          batchId: b.id,
          courseId: b.courseId,
          title: `${b.name} - Unit Test ${t + 1} (${subject})`,
          subject,
          testDate: subDays(new Date(), (t + 1) * 7 + Math.floor(Math.random() * 5)),
          totalMarks,
          passingMarks,
          description: `Mid-term evaluation for ${subject} unit chapter ${t + 1}.`,
        },
      });
      tests.push(test);

      // Add test results for students in this batch
      const batchStudents = students.filter((s) => s.batchId === b.id);
      for (const s of batchStudents) {
        const isAbsent = Math.random() > 0.88;
        const marksObtained = isAbsent
          ? null
          : Math.floor(passingMarks * 0.7 + Math.random() * (totalMarks - passingMarks * 0.7));

        await prisma.testResult.create({
          data: {
            testId: test.id,
            studentId: s.id,
            marksObtained,
            isAbsent,
            remarks: isAbsent ? "Absent due to illness" : marksObtained && marksObtained >= passingMarks ? "Good performance" : "Needs revision in fundamentals",
          },
        });
      }
    }
  }

  console.log("Seed complete:");
  console.log(`  Institute: ${institute.name}`);
  console.log(`  Users: owner@vidyalaya.test / password123 (OWNER)`);
  console.log(`         admin@platform.test / password123 (PLATFORM_ADMIN)`);
  console.log(`  Courses: ${courses.length}`);
  console.log(`  Faculty: ${faculty.length}`);
  console.log(`  Batches: ${batches.length}`);
  console.log(`  Students: ${students.length}`);
  console.log(`  Admissions: ${admissions.length}`);
  console.log(`  Tests: ${tests.length}`);
  console.log(`  Faculty reviews: ${reviewedStudents.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });