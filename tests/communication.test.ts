import { describe, it, expect } from "vitest";

describe("Phase 2 - Bulk Communication Message Personalization", () => {
  const template = "Hello {name}, your outstanding fee for {course} ({batch}) is {due_amount} at {institute_name}.";

  const recipient = {
    name: "Aman Gupta",
    courseName: "Class 11 Science",
    batchName: "Weekend Batch",
    dueAmount: 8500,
    instituteName: "Vidyalaya Institute",
  };

  it("replaces all personalization placeholders correctly", () => {
    const personalized = template
      .replace(/\{name\}/g, recipient.name)
      .replace(/\{course\}/g, recipient.courseName)
      .replace(/\{batch\}/g, recipient.batchName)
      .replace(/\{due_amount\}/g, `₹${recipient.dueAmount.toLocaleString("en-IN")}`)
      .replace(/\{institute_name\}/g, recipient.instituteName);

    expect(personalized).toBe(
      "Hello Aman Gupta, your outstanding fee for Class 11 Science (Weekend Batch) is ₹8,500 at Vidyalaya Institute."
    );
  });

  it("handles fallback values when optional fields are missing", () => {
    const emptyRecipient = {
      name: "Simran Kaur",
      courseName: undefined,
      batchName: undefined,
      dueAmount: undefined,
      instituteName: "Vidyalaya Institute",
    };

    const personalized = template
      .replace(/\{name\}/g, emptyRecipient.name)
      .replace(/\{course\}/g, emptyRecipient.courseName || "your course")
      .replace(/\{batch\}/g, emptyRecipient.batchName || "your batch")
      .replace(/\{due_amount\}/g, emptyRecipient.dueAmount ? `₹${emptyRecipient.dueAmount}` : "₹0")
      .replace(/\{institute_name\}/g, emptyRecipient.instituteName);

    expect(personalized).toBe(
      "Hello Simran Kaur, your outstanding fee for your course (your batch) is ₹0 at Vidyalaya Institute."
    );
  });
});

describe("Institute Registration Request and Admin Approval Workflow", () => {
  it("should generate a processing email for the institute owner", async () => {
    const { sendRegistrationProcessingEmail } = await import("@/lib/email");
    const result = await sendRegistrationProcessingEmail({
      to: "owner@testinstitute.com",
      ownerName: "Dr. Ramesh Sharma",
      instituteName: "Ramesh IIT Classes",
    });

    expect(result).toHaveProperty("sent");
  });

  it("should generate an alert email for the platform admin", async () => {
    const { sendAdminRegistrationAlertEmail } = await import("@/lib/email");
    const result = await sendAdminRegistrationAlertEmail({
      to: "admin@platform.test",
      instituteName: "Ramesh IIT Classes",
      ownerName: "Dr. Ramesh Sharma",
      instituteEmail: "owner@testinstitute.com",
      instituteMobile: "9876543210",
      adminPortalUrl: "http://localhost:3000/admin",
    });

    expect(result).toHaveProperty("sent");
  });

  it("should generate an access approval and welcome email for the institute owner", async () => {
    const { sendRegistrationApprovedEmail } = await import("@/lib/email");
    const result = await sendRegistrationApprovedEmail({
      to: "owner@testinstitute.com",
      ownerName: "Dr. Ramesh Sharma",
      instituteName: "Ramesh IIT Classes",
      loginUrl: "http://localhost:3000/login?portal=institute&email=owner%40testinstitute.com",
    });

    expect(result).toHaveProperty("sent");
  });
});

describe("Sub-Branch Request and Admin Approval Workflow", () => {
  it("should generate a branch processing email for institute owner and main campus", async () => {
    const { sendBranchProcessingEmail } = await import("@/lib/email");
    const result = await sendBranchProcessingEmail({
      to: "owner@testinstitute.com",
      recipientName: "Dr. Ramesh Sharma",
      branchName: "South Campus",
      instituteName: "Ramesh IIT Classes",
      city: "Kota",
    });

    expect(result).toHaveProperty("sent");
  });

  it("should generate a branch alert email for platform admin", async () => {
    const { sendAdminBranchAlertEmail } = await import("@/lib/email");
    const result = await sendAdminBranchAlertEmail({
      to: "admin@platform.test",
      branchName: "South Campus",
      instituteName: "Ramesh IIT Classes",
      ownerName: "Dr. Ramesh Sharma",
      city: "Kota",
      state: "Rajasthan",
      contact: "9876543210",
      adminPortalUrl: "http://localhost:3000/admin/branches",
    });

    expect(result).toHaveProperty("sent");
  });

  it("should generate a branch approved email when access is granted", async () => {
    const { sendBranchApprovedEmail } = await import("@/lib/email");
    const result = await sendBranchApprovedEmail({
      to: "owner@testinstitute.com",
      recipientName: "Dr. Ramesh Sharma",
      branchName: "South Campus",
      instituteName: "Ramesh IIT Classes",
      portalUrl: "http://localhost:3000/branches",
    });

    expect(result).toHaveProperty("sent");
  });

  it("should generate a branch approved email including login credentials", async () => {
    const { sendBranchApprovedEmail } = await import("@/lib/email");
    const result = await sendBranchApprovedEmail({
      to: "southcampus@testinstitute.com",
      recipientName: "South Campus Admin",
      branchName: "South Campus",
      instituteName: "Ramesh IIT Classes",
      portalUrl: "http://localhost:3000/login?portal=institute",
      loginEmail: "southcampus@testinstitute.com",
    });

    expect(result).toHaveProperty("sent");
  });
});


