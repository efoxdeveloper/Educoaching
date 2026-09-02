import { describe, it, expect } from "vitest";

describe("Feature 1 — Lead Follow-up Reminder Candidate Logic", () => {
  type MockAdmission = {
    id: string;
    applicantName: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "ENROLLED";
    nextFollowUpDate: Date | null;
    priority: "HOT" | "WARM" | "COLD";
    assignedTo: string | null;
  };

  const filterAndSortCandidates = (admissions: MockAdmission[], referenceDate: Date = new Date()) => {
    const todayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59, 999);

    const eligible = admissions.filter((a) => {
      // Exclude final statuses: ENROLLED and REJECTED
      if (a.status === "ENROLLED" || a.status === "REJECTED") return false;
      if (!a.nextFollowUpDate) return false;
      // Must be today or overdue (<= todayEnd)
      return a.nextFollowUpDate <= todayEnd;
    });

    const mapped = eligible.map((a) => {
      const isOverdue = (a.nextFollowUpDate as Date) < todayStart;
      const isToday = (a.nextFollowUpDate as Date) >= todayStart && (a.nextFollowUpDate as Date) <= todayEnd;
      return {
        ...a,
        isOverdue,
        isToday,
      };
    });

    const priorityScore = { HOT: 0, WARM: 1, COLD: 2 };
    return mapped.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }
      const pA = priorityScore[a.priority] ?? 1;
      const pB = priorityScore[b.priority] ?? 1;
      return pA - pB;
    });
  };

  it("includes leads scheduled for today or overdue", () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const future = new Date(today);
    future.setDate(future.getDate() + 3);

    const admissions: MockAdmission[] = [
      {
        id: "lead-1",
        applicantName: "Rahul Sharma",
        status: "PENDING",
        nextFollowUpDate: today,
        priority: "HOT",
        assignedTo: "Counsellor Priya",
      },
      {
        id: "lead-2",
        applicantName: "Ananya Gupta",
        status: "PENDING",
        nextFollowUpDate: yesterday,
        priority: "WARM",
        assignedTo: "Counsellor Priya",
      },
      {
        id: "lead-3",
        applicantName: "Vikram Singh",
        status: "PENDING",
        nextFollowUpDate: future,
        priority: "HOT",
        assignedTo: "Counsellor Amit",
      },
    ];

    const results = filterAndSortCandidates(admissions, now);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain("lead-1");
    expect(results.map((r) => r.id)).toContain("lead-2");
    expect(results.map((r) => r.id)).not.toContain("lead-3");
  });

  it("strictly excludes ENROLLED and REJECTED leads even if followUpDate is overdue", () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);

    const admissions: MockAdmission[] = [
      {
        id: "enrolled-lead",
        applicantName: "Pooja Verma",
        status: "ENROLLED",
        nextFollowUpDate: pastDate,
        priority: "HOT",
        assignedTo: "Counsellor Priya",
      },
      {
        id: "rejected-lead",
        applicantName: "Karan Johar",
        status: "REJECTED",
        nextFollowUpDate: pastDate,
        priority: "WARM",
        assignedTo: "Counsellor Amit",
      },
      {
        id: "active-lead",
        applicantName: "Sneha Patel",
        status: "PENDING",
        nextFollowUpDate: pastDate,
        priority: "HOT",
        assignedTo: "Counsellor Priya",
      },
    ];

    const results = filterAndSortCandidates(admissions, now);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("active-lead");
    expect(results[0].applicantName).toBe("Sneha Patel");
  });

  it("prioritizes overdue follow-ups before today follow-ups, and hot leads before warm/cold", () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const admissions: MockAdmission[] = [
      {
        id: "today-hot",
        applicantName: "Lead Today Hot",
        status: "PENDING",
        nextFollowUpDate: today,
        priority: "HOT",
        assignedTo: "Staff A",
      },
      {
        id: "overdue-warm",
        applicantName: "Lead Overdue Warm",
        status: "PENDING",
        nextFollowUpDate: yesterday,
        priority: "WARM",
        assignedTo: "Staff A",
      },
      {
        id: "overdue-hot",
        applicantName: "Lead Overdue Hot",
        status: "PENDING",
        nextFollowUpDate: yesterday,
        priority: "HOT",
        assignedTo: "Staff A",
      },
    ];

    const results = filterAndSortCandidates(admissions, now);
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe("overdue-hot");
    expect(results[1].id).toBe("overdue-warm");
    expect(results[2].id).toBe("today-hot");
  });

  it("correctly groups reminder digests by assigned counsellor", () => {
    const leads = [
      { id: "1", applicantName: "A", assignedTo: "Counsellor Priya" },
      { id: "2", applicantName: "B", assignedTo: "Counsellor Priya" },
      { id: "3", applicantName: "C", assignedTo: "Counsellor Amit" },
      { id: "4", applicantName: "D", assignedTo: null },
    ];

    const groups = new Map<string, typeof leads>();
    for (const l of leads) {
      const key = l.assignedTo?.trim() || "Unassigned";
      const list = groups.get(key) || [];
      list.push(l);
      groups.set(key, list);
    }

    expect(groups.get("Counsellor Priya")).toHaveLength(2);
    expect(groups.get("Counsellor Amit")).toHaveLength(1);
    expect(groups.get("Unassigned")).toHaveLength(1);
  });
});
