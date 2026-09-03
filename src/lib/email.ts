import nodemailer from "nodemailer";

export function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_USER.includes("your_email_here")
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail(to: string, subject: string, html: string) {
  if (!isEmailConfigured()) {
    console.warn(`[email] Skipped sending "${subject}" to ${to} — SMTP not configured in .env.`);
    return { sent: false, reason: "not_configured" as const };
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Vidyalaya Institute" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { sent: false, reason: "send_error" as const };
  }
}

function emailShell(title: string, bodyHtml: string) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F7F5F0;">
    <div style="background: #1E3A5F; padding: 20px 24px; border-radius: 14px 14px 0 0;">
      <span style="color: #E8A33D; font-weight: 700; font-size: 18px;">Vidyalaya</span>
      <span style="color: #D6E0EB; font-size: 12px; margin-left: 6px;">Institute Admin</span>
    </div>
    <div style="background: #ffffff; padding: 28px 24px; border-radius: 0 0 14px 14px; border: 1px solid #EEF2F7; border-top: none;">
      <h2 style="color: #171A21; font-size: 18px; margin: 0 0 12px;">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align: center; color: #7E9BBC; font-size: 11px; margin-top: 16px;">
      This is an automated message from Vidyalaya Institute Admin.
    </p>
  </div>`;
}

function renderCredentialsBlock(params: {
  title: string;
  description?: string;
  emailLabel: string;
  email: string;
  initialPassword?: string;
  portalUrl?: string;
  buttonLabel?: string;
  securityNotice?: string;
  note?: string;
}) {
  const {
    title,
    description,
    emailLabel,
    email,
    initialPassword,
    portalUrl,
    buttonLabel = "Open Portal &rarr;",
    securityNotice,
    note,
  } = params;

  return `
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <h3 style="color: #166534; font-size: 15px; margin: 0 0 8px; font-weight: 600;">
        ${title}
      </h3>
      ${description ? `<p style="color: #15803D; font-size: 13px; margin: 0 0 12px;">${description}</p>` : ""}
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #166534; font-weight: 600;">${emailLabel}</td>
          <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 700; color: #14532D;">${email}</td>
        </tr>
        ${
          initialPassword
            ? `
        <tr>
          <td style="padding: 4px 0; color: #166534; font-weight: 600;">Initial Password:</td>
          <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 700; color: #14532D; background: #DCFCE7; padding: 2px 8px; border-radius: 4px; display: inline-block;">${initialPassword}</td>
        </tr>
        `
            : ""
        }
      </table>
      ${
        securityNotice
          ? `<p style="color: #15803D; font-size: 12px; margin: 10px 0 0; line-height: 1.5; font-style: italic;">${securityNotice}</p>`
          : ""
      }
      ${
        note
          ? `<p style="color: #15803D; font-size: 12px; margin: 8px 0 0; line-height: 1.5;">${note}</p>`
          : ""
      }
      ${
        portalUrl
          ? `
      <div style="margin-top: 14px; text-align: center;">
        <a href="${portalUrl}" style="display: inline-block; background: #15803D; color: #ffffff; text-decoration: none; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;">
          ${buttonLabel}
        </a>
      </div>
      `
          : ""
      }
    </div>
  `;
}

export async function sendEnrollmentEmail(params: {
  to: string;
  studentName: string;
  courseName: string;
  batchName?: string | null;
  batchTiming?: string | null;
  totalFee: number;
  paidFee: number;
  isDemo: boolean;
  demoExpiresAt?: Date | null;
  initialPassword?: string;
  portalUrl?: string;
}) {
  const { to, studentName, courseName, batchName, batchTiming, totalFee, paidFee, isDemo, demoExpiresAt, initialPassword, portalUrl } = params;

  const batchRow = batchName
    ? `<tr><td style="padding: 6px 0; color: #4E6E93;">Batch</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${batchName}${batchTiming ? ` (${batchTiming})` : ""}</td></tr>`
    : `<tr><td style="padding: 6px 0; color: #4E6E93;">Batch</td><td style="padding: 6px 0; text-align: right; color: #7E9BBC;">To be assigned</td></tr>`;

  const feeRow = isDemo
    ? `<tr><td style="padding: 6px 0; color: #4E6E93;">Plan</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #D68F26;">7-day free demo${demoExpiresAt ? ` (ends ${demoExpiresAt.toLocaleDateString("en-IN")})` : ""}</td></tr>`
    : `<tr><td style="padding: 6px 0; color: #4E6E93;">Total Fee</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">₹${totalFee.toLocaleString("en-IN")}</td></tr>
       <tr><td style="padding: 6px 0; color: #4E6E93;">Paid</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1F9D66;">₹${paidFee.toLocaleString("en-IN")}</td></tr>`;

  const credentialsBlock = initialPassword
    ? renderCredentialsBlock({
        title: "🔑 Your Student Profile Login Credentials",
        description: "Use these credentials to sign in to your student portal, take CBT exams, view timetable, and access learning materials:",
        emailLabel: "Portal Email:",
        email: to,
        initialPassword,
        portalUrl,
        buttonLabel: "Open Student Portal &rarr;",
      })
    : "";

  const html = emailShell(
    `Welcome, ${studentName}! 🎓`,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      You've been successfully enrolled at Vidyalaya Institute. Here are your enrollment details:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #4E6E93;">Course</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${courseName}</td></tr>
      ${batchRow}
      ${feeRow}
    </table>
    ${credentialsBlock}
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      You can change your password anytime directly from your Student Portal under account settings. If you have any questions, feel free to reach out to the institute office.
    </p>
    `
  );

  return sendMail(to, `Welcome to ${courseName} — Enrollment Confirmed`, html);
}

export async function sendParentWelcomeEmail(params: {
  to: string;
  studentName: string;
  courseName: string;
  parentName?: string | null;
  initialPassword?: string;
  portalUrl?: string;
  isExistingAccount?: boolean;
  linkedChildrenCount?: number;
  instituteName?: string;
}) {
  const {
    to,
    studentName,
    courseName,
    parentName,
    initialPassword,
    portalUrl,
    isExistingAccount = false,
    linkedChildrenCount = 1,
    instituteName = "Vidyalaya Institute",
  } = params;

  const isSiblingCase = isExistingAccount || !initialPassword || linkedChildrenCount > 1;

  const headerTitle = isSiblingCase
    ? `${studentName} added to your Parent Portal 🎓`
    : `Welcome! You've been given portal access for ${studentName} 🎓`;

  const subject = isSiblingCase
    ? `${studentName} has been added to your Parent Portal account — ${instituteName}`
    : `Welcome to Parent Portal — Access for ${studentName} at ${instituteName}`;

  const greeting = parentName ? `Dear ${parentName},` : `Dear Parent,`;

  const introParagraph = isSiblingCase
    ? `<p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
        ${greeting}<br/>
        <strong>${studentName}</strong> (enrolled in <strong>${courseName}</strong>) has been added to your existing parent portal account. You can track fees, attendance, exam results, and study material for all your enrolled children from this single login.
      </p>`
    : `<p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
        ${greeting}<br/>
        You have been granted online portal access for <strong>${studentName}</strong> (enrolled in <strong>${courseName}</strong>) at ${instituteName}. Through your Parent Portal, you can conveniently monitor your child's attendance, view exam results and report cards, access study materials, and make online fee payments.
      </p>`;

  const credentialsBlock = initialPassword
    ? renderCredentialsBlock({
        title: "🔑 Your Parent Portal Login Credentials",
        description: "Use these credentials to sign in to your parent portal:",
        emailLabel: "Portal Email:",
        email: to,
        initialPassword,
        securityNotice: "For security, you'll be asked to set a new password the first time you log in.",
        portalUrl,
        buttonLabel: "Open Parent Portal &rarr;",
      })
    : isSiblingCase && portalUrl
    ? renderCredentialsBlock({
        title: "🔑 Your Parent Portal Access",
        description: "Log in with your existing parent credentials to access records for all your linked children:",
        emailLabel: "Portal Email:",
        email: to,
        note: "This one login covers all your linked children at Vidyalaya Institute.",
        portalUrl,
        buttonLabel: "Open Parent Portal &rarr;",
      })
    : "";

  const html = emailShell(
    headerTitle,
    `
    ${introParagraph}
    ${credentialsBlock}
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      If you have any questions or need assistance accessing your parent portal, please feel free to contact the institute administration.
    </p>
    `
  );

  return sendMail(to, subject, html);
}

export async function sendBatchAssignedEmail(params: {
  to: string;
  studentName: string;
  batchName: string;
  batchTiming: string;
  courseName: string;
}) {
  const { to, studentName, batchName, batchTiming, courseName } = params;

  const html = emailShell(
    `You've been assigned a batch, ${studentName}!`,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Great news — you've been added to a batch for <strong>${courseName}</strong>.
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #4E6E93;">Batch</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${batchName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Timing</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${batchTiming}</td></tr>
    </table>
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      Please arrive 10 minutes early for your first class. See you there!
    </p>
    `
  );

  return sendMail(to, `You're in! Batch assigned for ${courseName}`, html);
}

export async function sendRenewalEmail(params: {
  to: string;
  studentName: string;
  amount: number;
  validUntil: Date;
}) {
  const { to, studentName, amount, validUntil } = params;

  const html = emailShell(
    `Renewal confirmed, ${studentName}!`,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Your subscription has been renewed successfully.
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #4E6E93;">Amount</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">₹${amount.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Valid until</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1F9D66;">${validUntil.toLocaleDateString("en-IN")}</td></tr>
    </table>
    `
  );

  return sendMail(to, "Subscription Renewed — Vidyalaya Institute", html);
}

export async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  resetUrl: string;
}) {
  const { to, userName, resetUrl } = params;

  const html = emailShell(
    "Reset your password",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Hi ${userName},
    </p>

    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      We received a request to reset your Vidyalaya account password.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a
        href="${resetUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        Reset Password
      </a>
    </div>

    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      This link will expire in <strong>1 hour</strong>.
    </p>

    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      If you did not request a password reset, you can safely ignore this
      email. Your password will remain unchanged.
    </p>
    `
  );

  return sendMail(
    to,
    "Reset your Vidyalaya password",
    html
  );
}

export async function sendVerificationEmail(params: {
  to: string;
  ownerName: string;
  verifyUrl: string;
}) {
  const { to, ownerName, verifyUrl } = params;

  const html = emailShell(
    "Verify your email",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Hi ${ownerName},
    </p>

    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Thanks for signing up for Vidyalaya. Please verify your email address to activate your account.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a
        href="${verifyUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        Verify Email
      </a>
    </div>

    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      This link will expire in <strong>24 hours</strong>.
    </p>

    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      If you didn't create a Vidyalaya account, you can safely ignore this email.
    </p>
    `
  );

  return sendMail(to, "Verify your Vidyalaya email address", html);
}

export async function sendFeeReminderEmail(params: {
  to: string;
  studentName: string;
  courseName: string;
  dueAmount: number;
  dueDate?: string | null;
  instituteName?: string;
}) {
  const { to, studentName, courseName, dueAmount, dueDate, instituteName = "Vidyalaya Institute" } = params;

  const html = emailShell(
    `Fee Payment Reminder — ${studentName}`,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Dear Student / Parent,
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      This is a gentle reminder regarding the outstanding fee for <strong>${courseName}</strong> at ${instituteName}.
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #4E6E93;">Student Name</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${studentName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Course</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${courseName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Outstanding Due</td><td style="padding: 6px 0; text-align: right; font-weight: 700; color: #C2410C;">₹${dueAmount.toLocaleString("en-IN")}</td></tr>
      ${dueDate ? `<tr><td style="padding: 6px 0; color: #4E6E93;">Due Date</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${dueDate}</td></tr>` : ""}
    </table>
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      Please clear the pending dues at your earliest convenience to avoid any disruption to your classes. You can pay online or visit the institute office.
    </p>
    `
  );

  return sendMail(to, `Fee Due Reminder: ₹${dueAmount.toLocaleString("en-IN")} for ${studentName}`, html);
}

export async function sendBroadcastEmail(params: {
  to: string;
  subject: string;
  message: string;
  recipientName?: string;
  instituteName?: string;
}) {
  const { to, subject, message, recipientName, instituteName = "Vidyalaya Institute" } = params;

  const html = emailShell(
    subject,
    `
    ${recipientName ? `<p style="color: #171A21; font-weight: 600; font-size: 14px;">Dear ${recipientName},</p>` : ""}
    <div style="color: #4E6E93; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 16px 0;">
      ${message}
    </div>
    <p style="color: #7E9BBC; font-size: 12px; margin-top: 24px; border-top: 1px solid #EEF2F7; padding-top: 12px;">
      Broadcast from ${instituteName}
    </p>
    `
  );

  return sendMail(to, subject, html);
}

export async function sendSupportTicketReply(params: {
  to: string;
  ticketId: string;
  subject: string;
  message: string;
  instituteName?: string;
  ticketSubject?: string;
}) {
  const { to, ticketId, subject, message, instituteName = "Vidyalaya Institute", ticketSubject } = params;
  const html = emailShell(
    subject,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Your support ticket <strong>#${ticketId.slice(-6).toUpperCase()}</strong> ${ticketSubject ? `&ldquo;${ticketSubject}&rdquo; ` : ""}has received a reply from the ${instituteName} platform admin.
    </p>
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; color: #1E293B; font-size: 13px; line-height: 1.6;">${message}</div>
    <p style="color: #7E9BBC; font-size: 12px; margin-top: 16px; border-top: 1px solid #EEF2F7; padding-top: 12px;">
      Please do not reply directly to this email. Reply via your Help & Support → Support Tickets in the app for the fastest response.
    </p>
    `
  );
  return sendMail(to, subject, html);
}

export async function sendRegistrationProcessingEmail(params: {
  to: string;
  ownerName: string;
  instituteName: string;
}) {
  const { to, ownerName, instituteName } = params;

  const html = emailShell(
    "Registration Request Under Review",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Dear <strong>${ownerName}</strong>,
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Thank you for submitting your registration request for <strong>${instituteName}</strong>.
    </p>
    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
      <p style="color: #92400E; font-size: 13px; font-weight: 600; margin: 0 0 4px;">
        ⏳ Request in Processing
      </p>
      <p style="color: #B45309; font-size: 13px; margin: 0; line-height: 1.5;">
        Your institute registration request is currently being reviewed by our Platform Administrator.
      </p>
    </div>
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      Once access is granted, you will receive a confirmation email with instructions to sign in to your dashboard.
    </p>
    `
  );

  return sendMail(to, `Registration Request in Processing — ${instituteName}`, html);
}

export async function sendAdminRegistrationAlertEmail(params: {
  to: string;
  instituteName: string;
  ownerName: string;
  instituteEmail: string;
  instituteMobile: string;
  adminPortalUrl: string;
}) {
  const { to, instituteName, ownerName, instituteEmail, instituteMobile, adminPortalUrl } = params;

  const html = emailShell(
    "New Institute Registration Request",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      A new institute has requested to register on Vidyalaya:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #4E6E93;">Institute</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${instituteName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Owner / Director</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${ownerName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Email</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${instituteEmail}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Mobile</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${instituteMobile}</td></tr>
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a
        href="${adminPortalUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        Review in Admin Portal
      </a>
    </div>
    <p style="color: #4E6E93; font-size: 12px; line-height: 1.6;">
      You can grant access or review this institute from the Platform Overview.
    </p>
    `
  );

  return sendMail(to, `New Institute Registration Request: ${instituteName}`, html);
}

export async function sendRegistrationApprovedEmail(params: {
  to: string;
  ownerName: string;
  instituteName: string;
  loginUrl: string;
}) {
  const { to, ownerName, instituteName, loginUrl } = params;

  const html = emailShell(
    "Welcome to Vidyalaya — Access Granted!",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Dear <strong>${ownerName}</strong>,
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Great news! The Platform Administrator has approved your registration for <strong>${instituteName}</strong>.
    </p>
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
      <p style="color: #065F46; font-size: 13px; font-weight: 600; margin: 0 0 4px;">
        🎉 Access Granted
      </p>
      <p style="color: #047857; font-size: 13px; margin: 0; line-height: 1.5;">
        You can sign in now. Welcome to Vidyalaya app!
      </p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a
        href="${loginUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        Sign in to Dashboard
      </a>
    </div>
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      Use the official email and password you set during registration to sign in.
    </p>
    `
  );

  return sendMail(to, `Access Granted — Welcome to Vidyalaya app!`, html);
}

export async function sendBranchProcessingEmail(params: {
  to: string;
  recipientName: string;
  branchName: string;
  instituteName: string;
  city?: string | null;
  loginEmail?: string;
}) {
  const { to, recipientName, branchName, instituteName, city, loginEmail } = params;

  const credentialsBlock = loginEmail
    ? `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
      <p style="color: #1E293B; font-size: 13px; font-weight: 600; margin: 0 0 6px;">
        🔑 Registered Sub-Branch Sign-in Account
      </p>
      <p style="color: #475569; font-size: 13px; margin: 0 0 4px; line-height: 1.5;">
        <strong>Login Email:</strong> <span style="color: #1E3A5F; font-family: monospace;">${loginEmail}</span>
      </p>
      <p style="color: #64748B; font-size: 12px; margin: 0; line-height: 1.5;">
        Your branch user account has been registered. You can sign in using this email and your chosen password as soon as the platform administrator approves the campus.
      </p>
    </div>
    `
    : "";

  const html = emailShell(
    "Welcome — Sub-Branch Request in Processing",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Dear <strong>${recipientName}</strong>,
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Welcome to Vidyalaya! A registration request for sub-branch <strong>${branchName}</strong> ${city ? `(${city})` : ""} under <strong>${instituteName}</strong> has been successfully submitted.
    </p>
    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
      <p style="color: #92400E; font-size: 13px; font-weight: 600; margin: 0 0 4px;">
        ⏳ Request Currently in Processing
      </p>
      <p style="color: #B45309; font-size: 13px; margin: 0; line-height: 1.5;">
        Your sub-branch access request is currently being verified and reviewed by our Platform Administrator to confirm campus infrastructure and operational details.
      </p>
    </div>
    ${credentialsBlock}
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      As soon as access is granted by the Platform Administrator, you will receive an immediate activation notification email with your direct portal sign-in link.
    </p>
    `
  );

  return sendMail(to, `Welcome & Sub-Branch Request in Processing — ${branchName} (${instituteName})`, html);
}

export async function sendAdminBranchAlertEmail(params: {
  to: string;
  branchName: string;
  instituteName: string;
  ownerName: string;
  city?: string | null;
  state?: string | null;
  contact?: string | null;
  adminPortalUrl: string;
}) {
  const { to, branchName, instituteName, ownerName, city, state, contact, adminPortalUrl } = params;

  const html = emailShell(
    "New Sub-Branch Access Request",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      An institute has submitted a request to add a new sub-branch:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #4E6E93;">Sub-Branch</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${branchName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Institute</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${instituteName}</td></tr>
      <tr><td style="padding: 6px 0; color: #4E6E93;">Requested By</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${ownerName}</td></tr>
      ${city ? `<tr><td style="padding: 6px 0; color: #4E6E93;">Location</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${city}${state ? `, ${state}` : ""}</td></tr>` : ""}
      ${contact ? `<tr><td style="padding: 6px 0; color: #4E6E93;">Contact</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #171A21;">${contact}</td></tr>` : ""}
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a
        href="${adminPortalUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        Review in Admin Portal
      </a>
    </div>
    <p style="color: #4E6E93; font-size: 12px; line-height: 1.6;">
      You can grant access or review this branch request in the Platform Admin Dashboard.
    </p>
    `
  );

  return sendMail(to, `New Sub-Branch Request: ${branchName} (${instituteName})`, html);
}

export async function sendBranchApprovedEmail(params: {
  to: string;
  recipientName: string;
  branchName: string;
  instituteName: string;
  portalUrl: string;
  loginEmail?: string;
}) {
  const { to, recipientName, branchName, instituteName, portalUrl, loginEmail } = params;

  const credentialsBlock = loginEmail
    ? `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
      <p style="color: #1E293B; font-size: 13px; font-weight: 600; margin: 0 0 6px;">
        🔑 Your Sub-Branch Login Credentials
      </p>
      <p style="color: #475569; font-size: 13px; margin: 0 0 4px; line-height: 1.5;">
        <strong>Sign-in Email:</strong> <span style="color: #1E3A5F; font-family: monospace;">${loginEmail}</span>
      </p>
      <p style="color: #64748B; font-size: 12px; margin: 0; line-height: 1.5;">
        Use the password configured during branch setup to sign in.
      </p>
    </div>
    `
    : "";

  const html = emailShell(
    "Branch Access Granted!",
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Dear <strong>${recipientName}</strong>,
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      The Platform Administrator has granted access for sub-branch <strong>${branchName}</strong> under <strong>${instituteName}</strong>.
    </p>
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
      <p style="color: #065F46; font-size: 13px; font-weight: 600; margin: 0 0 4px;">
        🎉 Sub-Branch Activated
      </p>
      <p style="color: #047857; font-size: 13px; margin: 0; line-height: 1.5;">
        The branch is now ACTIVE. You can now sign in with your credentials to manage students, courses, batches, and operations for this branch.
      </p>
    </div>
    ${credentialsBlock}
    <div style="text-align: center; margin: 24px 0;">
      <a
        href="${portalUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        Sign in to Vidyalaya Portal
      </a>
    </div>
    `
  );

  return sendMail(to, `Sub-Branch Access Granted: ${branchName} — Vidyalaya`, html);
}

export async function sendSecurityVerificationEmail(params: {
  to: string;
  recipientName?: string;
  ownerName?: string;
  instituteName: string;
  type: "PASSWORD_CHANGE" | "EMAIL_CHANGE";
  targetEmail?: string;
  verifyUrl: string;
}) {
  const { to, recipientName, ownerName, instituteName, type, targetEmail, verifyUrl } = params;
  const name = recipientName || ownerName || "User";

  const isPassword = type === "PASSWORD_CHANGE";
  const title = isPassword ? "Verify Password Change Request" : "Verify Email Change Request";
  const actionLabel = isPassword ? "Confirm & Change Password" : "Confirm & Change Email";

  const description = isPassword
    ? `We received a request to change your account password for <strong>${instituteName}</strong>. If this was you, please confirm below to set your new password.`
    : `We received a request to change the login and contact email for <strong>${instituteName}</strong> to <span style="color: #1E3A5F; font-weight: 600;">${targetEmail}</span>. If this was you, please click below to confirm this change.`;

  const html = emailShell(
    title,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      ${description}
    </p>

    <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 16px; margin: 18px 0;">
      <p style="color: #92400E; font-size: 13px; font-weight: 600; margin: 0 0 2px;">
        ⚠️ Is it you who requested this change?
      </p>
      <p style="color: #B45309; font-size: 12px; margin: 0; line-height: 1.4;">
        If you did not initiate this request, please ignore this email. Your current ${isPassword ? "password" : "email"} will remain safe and unchanged.
      </p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a
        href="${verifyUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 13px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        ${actionLabel}
      </a>
    </div>

    <p style="color: #4E6E93; font-size: 12px; line-height: 1.6;">
      This security verification link will expire in <strong>1 hour</strong>.
    </p>
    `
  );

  return sendMail(
    to,
    `${title} — ${instituteName}`,
    html
  );
}

export async function sendLeadFollowUpReminderEmail(params: {
  to: string;
  counsellorName: string;
  instituteName: string;
  leads: Array<{
    applicantName: string;
    mobile: string;
    courseName: string;
    priority: string;
    dueDate: string;
    note?: string | null;
  }>;
}) {
  const { to, counsellorName, instituteName, leads } = params;
  const rowsHtml = leads
    .map(
      (l) => `
      <tr style="border-bottom: 1px solid #EEF2F7;">
        <td style="padding: 8px 4px; font-weight: 600; color: #171A21;">${l.applicantName}</td>
        <td style="padding: 8px 4px; color: #4E6E93;">${l.courseName}</td>
        <td style="padding: 8px 4px; font-family: monospace; color: #1E3A5F;">${l.mobile}</td>
        <td style="padding: 8px 4px; font-weight: 700; color: ${l.priority === "HOT" ? "#DC2626" : l.priority === "WARM" ? "#D97706" : "#2563EB"};">${l.priority}</td>
        <td style="padding: 8px 4px; font-size: 12px; color: #64748B;">${l.note || "—"}</td>
      </tr>`
    )
    .join("");

  const html = emailShell(
    `Daily Lead Follow-Up Reminder (${leads.length} Due)`,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Hello ${counsellorName},
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      You have <strong>${leads.length}</strong> prospective student follow-up(s) scheduled for today or overdue at <strong>${instituteName}</strong>:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #CBD5E1; text-align: left; color: #475569; font-size: 11px; text-transform: uppercase;">
          <th style="padding: 6px 4px;">Applicant</th>
          <th style="padding: 6px 4px;">Course</th>
          <th style="padding: 6px 4px;">Phone</th>
          <th style="padding: 6px 4px;">Priority</th>
          <th style="padding: 6px 4px;">Last Note</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <p style="color: #4E6E93; font-size: 13px; line-height: 1.6;">
      Please review your Admissions CRM to connect with these applicants and log the conversation outcomes.
    </p>
    `
  );

  return sendMail(to, `Daily Lead Follow-Up Reminder: ${leads.length} candidate(s) due — ${instituteName}`, html);
}

export async function sendPaymentReceiptEmail(params: {
  to: string;
  studentName: string;
  amount: number;
  paymentMethod: string;
  receiptNumber: string;
  instituteName: string;
  courseName?: string;
  isRefund?: boolean;
  refundReason?: string | null;
  portalUrl?: string;
}) {
  const {
    to,
    studentName,
    amount,
    paymentMethod,
    receiptNumber,
    instituteName,
    courseName,
    isRefund,
    refundReason,
    portalUrl,
  } = params;

  const title = isRefund ? "Fee Refund Processed" : "Fee Payment Confirmation & Receipt";
  const actionText = isRefund ? "Your fee refund has been processed." : "Thank you for your payment. Your official receipt has been generated.";

  const html = emailShell(
    title,
    `
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      Hello ${studentName},
    </p>
    <p style="color: #4E6E93; font-size: 14px; line-height: 1.6;">
      ${actionText}
    </p>
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Receipt #:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0F172A; text-align: right; font-family: monospace;">${receiptNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Institute:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${instituteName}</td>
        </tr>
        ${courseName ? `
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Course:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${courseName}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Payment Mode:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${paymentMethod}</td>
        </tr>
        ${isRefund && refundReason ? `
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Reason for Refund:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #DC2626; text-align: right;">${refundReason}</td>
        </tr>` : ""}
        <tr style="border-top: 1px solid #CBD5E1;">
          <td style="padding: 10px 0 4px; font-weight: 700; color: #0F172A; font-size: 14px;">${isRefund ? "Total Refunded:" : "Total Amount Paid:"}</td>
          <td style="padding: 10px 0 4px; font-weight: 700; color: ${isRefund ? "#DC2626" : "#059669"}; font-size: 16px; text-align: right;">₹${amount.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    ${portalUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a
        href="${portalUrl}"
        style="
          display: inline-block;
          background: #1E3A5F;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        "
      >
        View & Download Receipt in Portal
      </a>
    </div>` : ""}

    <p style="color: #64748B; font-size: 12px; line-height: 1.6;">
      Please preserve this receipt for your academic records and accounting reference.
    </p>
    `
  );

  return sendMail(to, `${title} [${receiptNumber}] — ${instituteName}`, html);
}
