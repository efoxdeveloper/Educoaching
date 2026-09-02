"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Megaphone,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  Users,
  Eye,
  History,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/utils";

type Recipient = {
  id: string;
  name: string;
  mobile: string;
  parentMobile: string | null;
  email: string | null;
  courseName?: string;
  batchName?: string;
  dueAmount?: number;
  type: "STUDENT" | "LEAD";
};

type Campaign = {
  id: string;
  title: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  targetAudience: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: string;
  sender?: { name: string; email: string } | null;
};

type Course = { id: string; name: string };
type Batch = { id: string; name: string; courseId: string };

export type BroadcastTemplate = {
  id: number;
  name: string;
  category: "Admissions" | "Fees" | "Attendance" | "Exams & Tests" | "LMS & App" | "General";
  title: string;
  message: string;
};

const TEMPLATES: BroadcastTemplate[] = [
  {
    id: 1,
    name: "1. New Batch Starting",
    category: "Admissions",
    title: "New Batch Starting Announcement",
    message:
      "Dear {Student Name}, new batch starting {Date & Time} at {Institute Name}. Confirm your admission before it's too late. — Regards, {Institute Name}",
  },
  {
    id: 2,
    name: "2. New Admission Started",
    category: "Admissions",
    title: "Admissions Open for New Session",
    message:
      "Dear {Student Name}, admission process has started for academic year {Academic Year} at {Institute Name}. Confirm your admission before it's too late. — Regards, {Institute Name}",
  },
  {
    id: 3,
    name: "3. Admission Inquiry Welcome",
    category: "Admissions",
    title: "Thank You for Your Admission Inquiry",
    message:
      "Dear {Student Name}, thank you for your admission inquiry at {Institute Name}. Our staff will assist you with the admission process. — Regards, {Institute Name}",
  },
  {
    id: 4,
    name: "4. Admission Confirmed",
    category: "Admissions",
    title: "Admission Confirmation Notice",
    message:
      "Dear {Student Name}, welcome to {Institute Name} — your admission is confirmed. — Regards, {Institute Name}",
  },
  {
    id: 5,
    name: "5. Mobile App Login Details",
    category: "LMS & App",
    title: "Student Portal & App Login Credentials",
    message:
      "Dear {Student Name}, your login details for {Institute Name}: User ID: {userid}, Password: {password}. Download the app: {App Link} — Regards, {Institute Name}",
  },
  {
    id: 6,
    name: "6. Birthday Wish",
    category: "General",
    title: "Warm Birthday Greetings",
    message:
      "Dear {Student Name}, wishing you a very happy birthday! May you be blessed with health, wealth, and prosperity. — Regards, {Institute Name}",
  },
  {
    id: 7,
    name: "7. Attendance Absent Alert",
    category: "Attendance",
    title: "Daily Attendance Absence Alert",
    message:
      "Alert from {Institute Name}: {Student Name} was absent today for the {Time} batch. — Regards, {Institute Name}",
  },
  {
    id: 8,
    name: "8. Attendance Performance Summary",
    category: "Attendance",
    title: "Attendance Performance Summary Report",
    message:
      "Dear {Student Name}, your average attendance is {Percent}%. Total classes: {Total}, Present: {Present}, Absent: {Absent}. — Regards, {Institute Name}",
  },
  {
    id: 9,
    name: "9. Fee Received",
    category: "Fees",
    title: "Fee Payment Receipt Acknowledgment",
    message:
      "Dear {Student Name}, your fee payment of {Amount} was received on {Date}. Total fees: {Total}, Received: {Received}, Pending: {Pending}. — Regards, {Institute Name}",
  },
  {
    id: 10,
    name: "10. Fee Due Reminder",
    category: "Fees",
    title: "Pending Fee Payment Reminder",
    message:
      "Dear {Student Name}, this is a reminder that your fee payment is due. Pending amount: {Amount}, installment due: {Amount}. Please ignore if already paid. — Regards, {Institute Name}",
  },
  {
    id: 11,
    name: "11. Fee Status Summary",
    category: "Fees",
    title: "Fee Account Balance Summary",
    message:
      "Dear {Student Name}, your fee status: Total {Amount}, Received {Amount}, Pending {Amount}. — Regards, {Institute Name}",
  },
  {
    id: 12,
    name: "12. Exam Scheduled",
    category: "Exams & Tests",
    title: "Upcoming Exam Notification",
    message:
      "Dear {Student Name}, a new exam has been scheduled for {Subject Name} on {Date}. — Regards, {Institute Name}",
  },
  {
    id: 13,
    name: "13. Exam Absent Alert",
    category: "Exams & Tests",
    title: "Exam Absence Notification",
    message:
      "{Student Name} was absent for the {Subject Name} exam on {Date}. — Regards, {Institute Name}",
  },
  {
    id: 14,
    name: "14. Exam Marks Notification",
    category: "Exams & Tests",
    title: "Exam Marks Notification",
    message:
      "Dear {Student Name}, you scored {Marks} out of {Total} in the {Subject Name} exam conducted on {Date}. — Regards, {Institute Name}",
  },
  {
    id: 15,
    name: "15. Online Exam Scheduled",
    category: "Exams & Tests",
    title: "Online Exam Scheduled Notice",
    message:
      "Dear {Student Name}, a new online exam has been assigned for {Subject Name}. Attend between {Start Date} and {End Date}. — Regards, {Institute Name}",
  },
  {
    id: 16,
    name: "16. Online Exam Marks",
    category: "Exams & Tests",
    title: "Online Exam Score Published",
    message:
      "Dear {Student Name}, you scored {Marks} out of {Total} in the online exam for {Subject Name} conducted on {Date}. — Regards, {Institute Name}",
  },
  {
    id: 17,
    name: "17. Overall Performance Summary",
    category: "Exams & Tests",
    title: "Overall Academic Performance Summary",
    message:
      "Dear {Student Name}, your overall exam performance: {Subject 1} — {Percent}% ({Attended}/{Total} exams), {Subject 2} — {Percent}% ({Attended}/{Total} exams). — Regards, {Institute Name}",
  },
  {
    id: 18,
    name: "18. Homework/Assignment Shared",
    category: "LMS & App",
    title: "New Homework / Assignment Shared",
    message:
      "Dear {Student Name}, a new homework document has been shared with you. — Regards, {Institute Name}",
  },
];

const AUDIENCE_OPTIONS = [
  { value: "ALL_STUDENTS", label: "All Active Students" },
  { value: "BY_COURSE", label: "By Specific Course / Program" },
  { value: "BY_BATCH", label: "By Specific Batch" },
  { value: "FEE_OVERDUE", label: "Fee Overdue Students Only" },
  { value: "FEE_PENDING", label: "Any Unpaid Balance Students" },
  { value: "ADMISSION_LEADS", label: "Prospective Leads & Enquiries" },
];

export function BulkCommunicationView() {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Options state
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Composer state
  const [targetAudience, setTargetAudience] = useState("ALL_STUDENTS");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [leadStage, setLeadStage] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL" | "SMS">("WHATSAPP");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Recipients calculation
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Dispatch state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = useState(false);
  const [noRecipientsNotice, setNoRecipientsNotice] = useState(false);

  // History state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState(false);

  // Fetch courses, batches, and SMS config on mount
  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setCourses(data))
      .catch(() => {});

    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setBatches(data))
      .catch(() => {});

    fetch("/api/institutes/sms-config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isConfigured && data.enabled) {
          setSmsConfigured(true);
        } else {
          setSmsConfigured(false);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch recipients when filters change
  useEffect(() => {
    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        const params = new URLSearchParams();
        params.set("targetAudience", targetAudience);
        if (selectedCourseId) params.set("courseId", selectedCourseId);
        if (selectedBatchId) params.set("batchId", selectedBatchId);
        if (leadStage) params.set("leadStage", leadStage);

        const res = await fetch(`/api/communication/recipients?${params.toString()}`);
        const data = await res.json();
        if (data.recipients) {
          setRecipients(data.recipients);
        }
      } catch {
        console.error("Failed to load recipients");
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchRecipients();
  }, [targetAudience, selectedCourseId, selectedBatchId, leadStage]);

  // Fetch history when tab opens
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/communication/history");
      const data = await res.json();
      if (data.campaigns) setCampaigns(data.campaigns);
    } catch {
      console.error("Failed to load campaigns");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const insertTag = (tag: string) => {
    setMessage((prev) => prev + tag);
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
  };

  // Sample personalized preview
  const sampleRecipient = useMemo(
    () =>
      recipients[0] || {
        name: "Rohan Sharma",
        courseName: "Class 12 - JEE Advanced",
        batchName: "Alpha Batch (Evening)",
        dueAmount: 15000,
      },
    [recipients]
  );

  const previewText = useMemo(() => {
    if (!message) return "Enter your message above to see a preview with personalized student data.";
    return message
      // Both legacy and new template tag variants
      .replace(/\{Student Name\}|\{name\}/gi, sampleRecipient.name)
      .replace(/\{Institute Name\}|\{institute_name\}/gi, "Vidyalaya Institute")
      .replace(/\{Date & Time\}/gi, "Monday, 10:00 AM")
      .replace(/\{Academic Year\}/gi, "2026-27")
      .replace(/\{userid\}/gi, sampleRecipient.email || "rohan.sharma")
      .replace(/\{password\}/gi, "student123")
      .replace(/\{App Link\}/gi, "https://app.vidyalaya.edu/download")
      .replace(/\{Time\}/gi, "10:00 AM - 12:00 PM")
      .replace(/\{Percent\}/gi, "88")
      .replace(/\{Total\}/gi, "50")
      .replace(/\{Present\}/gi, "44")
      .replace(/\{Absent\}/gi, "6")
      .replace(/\{Marks\}/gi, "85")
      .replace(/\{Subject Name\}|\{Subject 1\}/gi, "Physics")
      .replace(/\{Subject 2\}/gi, "Mathematics")
      .replace(/\{Start Date\}/gi, "05 Sep 2026")
      .replace(/\{End Date\}/gi, "10 Sep 2026")
      .replace(/\{Attended\}/gi, "9")
      .replace(/\{Date\}/gi, formatDate(new Date()))
      .replace(/\{Amount\}/gi, `₹${(sampleRecipient.dueAmount || 15000).toLocaleString("en-IN")}`)
      .replace(/\{Received\}/gi, "₹35,000")
      .replace(/\{Pending\}/gi, `₹${(sampleRecipient.dueAmount || 15000).toLocaleString("en-IN")}`)
      .replace(/\{course\}/g, sampleRecipient.courseName || "JEE Advanced")
      .replace(/\{batch\}/g, sampleRecipient.batchName || "Alpha Batch")
      .replace(/\{due_amount\}/g, `₹${(sampleRecipient.dueAmount || 0).toLocaleString("en-IN")}`);
  }, [message, sampleRecipient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (recipients.length === 0) {
      setNoRecipientsNotice(true);
      return;
    }
    setConfirmBroadcastOpen(true);
  };

  const executeBroadcast = async () => {
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/communication/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          channel,
          targetAudience,
          filterDetails: {
            courseId: selectedCourseId || undefined,
            batchId: selectedBatchId || undefined,
            leadStage: leadStage || undefined,
          },
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Broadcast dispatch failed");
      }

      setConfirmBroadcastOpen(false);
      setSendResult({
        success: true,
        message: `Broadcast successfully dispatched to ${data.sentCount} recipients (${data.failedCount} failed/skipped).`,
      });
      setTitle("");
      setMessage("");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to broadcast message";
      setSendResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Top Banner Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active Audience Available"
          value={recipients.length.toString()}
          icon={Users}
          accent="marigold"
          trend={`${targetAudience.replace(/_/g, " ").toLowerCase()}`}
        />
        <KpiCard
          label="Preferred Broadcast Channel"
          value={channel}
          icon={channel === "WHATSAPP" ? MessageSquare : channel === "EMAIL" ? Mail : Smartphone}
          accent="scholar"
        />
        <KpiCard
          label="Available Courses"
          value={courses.length.toString()}
          icon={Megaphone}
          accent="scholar"
        />
        <KpiCard
          label="Active Batches"
          value={batches.length.toString()}
          icon={Users}
          accent="marigold"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b border-scholar-100 bg-paper px-4 pt-2">
        <button
          onClick={() => setActiveTab("compose")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold ${
            activeTab === "compose"
              ? "border-scholar-600 text-scholar-900"
              : "border-transparent text-scholar-400 hover:text-scholar-600"
          }`}
        >
          <Megaphone size={15} /> Compose Broadcast
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold ${
            activeTab === "history"
              ? "border-scholar-600 text-scholar-900"
              : "border-transparent text-scholar-400 hover:text-scholar-600"
          }`}
        >
          <History size={15} /> Broadcast History
        </button>
      </div>

      {activeTab === "compose" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              {sendResult && (
                <div
                  className={`mb-5 flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-semibold ${
                    sendResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {sendResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {sendResult.message}
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-5">
                {/* Step 1: Target Audience */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-scholar-500">
                    1. Select Target Audience & Filters
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <select
                        value={targetAudience}
                        onChange={(e) => {
                          setTargetAudience(e.target.value);
                          setSelectedCourseId("");
                          setSelectedBatchId("");
                          setLeadStage("");
                        }}
                        className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-scholar-800 outline-none"
                      >
                        {AUDIENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Filters */}
                    {targetAudience === "BY_COURSE" && (
                      <div>
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs text-scholar-800 outline-none"
                        >
                          <option value="">Choose Course / Program...</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {targetAudience === "BY_BATCH" && (
                      <div>
                        <select
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs text-scholar-800 outline-none"
                        >
                          <option value="">Choose Batch...</option>
                          {batches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {targetAudience === "ADMISSION_LEADS" && (
                      <div>
                        <select
                          value={leadStage}
                          onChange={(e) => setLeadStage(e.target.value)}
                          className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs text-scholar-800 outline-none"
                        >
                          <option value="">All Enquiry Stages</option>
                          <option value="NEW">New Enquiries</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                          <option value="CONVERTED">Converted</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Recipient Counter Badge */}
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-scholar-50/80 px-4 py-2.5 border border-scholar-100">
                    <div className="flex items-center gap-2 text-xs text-scholar-700">
                      <Users size={15} className="text-scholar-500" />
                      <span>
                        Targeting: <strong>{loadingRecipients ? "calculating..." : `${recipients.length} recipient(s)`}</strong> matching filter criteria
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      disabled={recipients.length === 0}
                      className="flex items-center gap-1 text-xs font-semibold text-scholar-600 hover:text-scholar-900 disabled:opacity-40"
                    >
                      <Eye size={13} /> View List
                    </button>
                  </div>
                </div>

                {/* Step 2: Channel Selection */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-scholar-500">
                    2. Select Communication Channel
                  </label>
                  <div className={`grid ${smsConfigured ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                    <button
                      type="button"
                      onClick={() => setChannel("WHATSAPP")}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                        channel === "WHATSAPP"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20"
                          : "border-scholar-200 bg-white text-scholar-600 hover:bg-scholar-50"
                      }`}
                    >
                      <MessageSquare size={18} className="text-emerald-600" />
                      <span>WhatsApp Alert</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel("EMAIL")}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                        channel === "EMAIL"
                          ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-500/20"
                          : "border-scholar-200 bg-white text-scholar-600 hover:bg-scholar-50"
                      }`}
                    >
                      <Mail size={18} className="text-blue-600" />
                      <span>Email Broadcast</span>
                    </button>

                    {smsConfigured && (
                      <button
                        type="button"
                        onClick={() => setChannel("SMS")}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                          channel === "SMS"
                            ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm ring-2 ring-amber-500/20"
                            : "border-scholar-200 bg-white text-scholar-600 hover:bg-scholar-50"
                        }`}
                      >
                        <Smartphone size={18} className="text-amber-600" />
                        <span>SMS Dispatch</span>
                      </button>
                    )}
                  </div>

                  {!smsConfigured && (
                    <div className="mt-2.5 flex items-center justify-between rounded-xl bg-scholar-50 p-2.5 px-3 border border-scholar-200/70 text-[11px] text-scholar-600">
                      <span>SMS Gateway is unconfigured. Bring your own MSG91 / Textlocal / Fast2SMS key to send SMS.</span>
                      <a href="/settings" className="font-bold text-scholar-800 underline hover:text-ink shrink-0 ml-2">
                        Configure SMS Key &rarr;
                      </a>
                    </div>
                  )}

                  {channel === "SMS" && smsConfigured && (
                    <div className="mt-2.5 flex items-center justify-between rounded-xl bg-amber-50/80 p-2.5 px-3 border border-amber-200/70 text-[11px] text-amber-800">
                      <span>Using your institute&apos;s configured BYOK SMS gateway.</span>
                      <a href="/settings" className="font-bold underline hover:text-amber-950">
                        Manage SMS Settings &rarr;
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 3: Message Content */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-scholar-500">
                      3. Broadcast Message
                    </label>
                  </div>

                  <div className="mb-2">
                    <input
                      required
                      type="text"
                      placeholder="Broadcast Campaign Title / Subject (e.g. Center Holiday Announcement)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-scholar-500"
                    />
                  </div>

                  {/* Personalization Tag Chips */}
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-scholar-500">
                        Click tags to insert into message:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1 bg-scholar-50/50 rounded-lg border border-scholar-100">
                      {[
                        "{Student Name}",
                        "{Institute Name}",
                        "{Date & Time}",
                        "{Academic Year}",
                        "{userid}",
                        "{password}",
                        "{App Link}",
                        "{Time}",
                        "{Percent}",
                        "{Total}",
                        "{Present}",
                        "{Absent}",
                        "{Amount}",
                        "{Received}",
                        "{Pending}",
                        "{Subject Name}",
                        "{Marks}",
                        "{Start Date}",
                        "{End Date}",
                        "{Date}",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertTag(tag)}
                          className="rounded-md border border-scholar-200 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-scholar-700 hover:bg-scholar-100 hover:border-scholar-300 transition-colors shadow-2xs"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    required
                    rows={6}
                    placeholder="Write your broadcast announcement message here... You can use personalization tags like {Student Name}, {Institute Name}, {Amount}, etc."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-xl border border-scholar-200 bg-white p-3.5 text-xs leading-relaxed text-ink outline-none focus:border-scholar-500"
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={sending || recipients.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-scholar-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-40"
                  >
                    <Send size={15} />
                    {sending
                      ? "Broadcasting Now..."
                      : `Send Broadcast to ${recipients.length} Recipient(s)`}
                  </button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Templates & Preview */}
          <div className="space-y-6">
            {/* Quick Templates Card with 18 Templates */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-scholar-600">
                  <Sparkles size={14} className="text-marigold-500" /> Pre-built Templates ({TEMPLATES.length})
                </div>
                <span className="text-[11px] text-scholar-400 font-medium">Click to load</span>
              </div>

              {/* Template list with scroll */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="w-full text-left rounded-xl border border-scholar-100 p-2.5 transition-all hover:border-scholar-300 hover:bg-scholar-50/80 hover:shadow-xs group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold text-ink group-hover:text-scholar-800">{tpl.name}</p>
                      <span className="rounded bg-scholar-100 px-1.5 py-0.5 text-[9px] font-semibold text-scholar-600 uppercase tracking-wider shrink-0">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-scholar-500 line-clamp-2 leading-tight">{tpl.message}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Live Personalized Preview Card */}
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-scholar-500">
                  Live Preview
                </span>
                <span className="rounded bg-scholar-100 px-1.5 py-0.5 text-[10px] font-semibold text-scholar-600">
                  Sample: {sampleRecipient.name}
                </span>
              </div>
              <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5">
                <p className="font-semibold text-xs text-ink mb-1">{title || "Broadcast Title"}</p>
                <p className="text-xs leading-relaxed text-scholar-700 whitespace-pre-wrap">
                  {previewText}
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* History Tab */
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-scholar-100 text-left text-[11px] font-semibold uppercase tracking-wider text-scholar-400">
                  <th className="pb-3 pr-4">Campaign Title</th>
                  <th className="pb-3 pr-4">Channel</th>
                  <th className="pb-3 pr-4">Audience</th>
                  <th className="pb-3 pr-4">Recipients</th>
                  <th className="pb-3 pr-4">Delivered</th>
                  <th className="pb-3 pr-4">Sender</th>
                  <th className="pb-3 pr-2 text-right">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-scholar-50/40">
                    <td className="py-3 pr-4 font-semibold text-ink">{c.title}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded bg-scholar-100 px-2 py-0.5 font-mono text-[10px] text-scholar-700">
                        {c.channel === "WHATSAPP" && <MessageSquare size={11} />}
                        {c.channel === "EMAIL" && <Mail size={11} />}
                        {c.channel === "SMS" && <Smartphone size={11} />}
                        {c.channel}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-scholar-600">
                      {c.targetAudience.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 pr-4 font-bold text-ink">{c.recipientCount}</td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-emerald-700">{c.sentCount}</span>
                      {c.failedCount > 0 && (
                        <span className="ml-1 text-rose-600">({c.failedCount} failed)</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-scholar-500">{c.sender?.name || "System"}</td>
                    <td className="py-3 pr-2 text-right text-scholar-400">
                      {formatDate(c.sentAt)}
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && !loadingHistory && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-scholar-400">
                      No broadcast campaigns recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recipients List Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scholar-950/40 backdrop-blur-sm p-4">
          <div className="flex h-full max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-scholar-100 px-5 py-4">
              <h3 className="font-display text-sm font-semibold text-ink">
                Audience Preview ({recipients.length} recipients)
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-1 text-scholar-400 hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-scholar-100 text-[11px] font-semibold uppercase text-scholar-400">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Course / Batch</th>
                    <th className="pb-2">Phone</th>
                    <th className="pb-2">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-scholar-50">
                  {recipients.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 font-semibold text-ink">{r.name}</td>
                      <td className="py-2 text-scholar-600">
                        {r.courseName || "—"} {r.batchName ? `(${r.batchName})` : ""}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-scholar-700">
                        {r.parentMobile || r.mobile}
                      </td>
                      <td className="py-2 text-scholar-500">{r.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* No Recipients Notice Modal */}
      <ConfirmDialog
        open={noRecipientsNotice}
        onClose={() => setNoRecipientsNotice(false)}
        onConfirm={() => setNoRecipientsNotice(false)}
        title="No Recipients Found"
        message="No students or leads currently match your selected target audience filters."
        confirmLabel="Understood"
        cancelLabel="Close"
        tone="warn"
      />

      {/* Broadcast Confirmation Dialog */}
      <ConfirmDialog
        open={confirmBroadcastOpen}
        onClose={() => setConfirmBroadcastOpen(false)}
        onConfirm={executeBroadcast}
        title="Broadcast Message Confirmation"
        message={
          <span>
            Are you sure you want to broadcast <strong>&ldquo;{title}&rdquo;</strong> to{" "}
            <strong>{recipients.length} recipient(s)</strong> via <strong>{channel}</strong>?
          </span>
        }
        confirmLabel="Send Broadcast Now"
        cancelLabel="Cancel"
        tone="info"
        loading={sending}
      />
    </>
  );
}
