"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HelpCircle,
  MessageSquare,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ticket,
  ExternalLink,
  Copy,
  Check,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { getWhatsAppWebUrl } from "@/lib/whatsapp-link";
import { formatDate } from "@/lib/utils";

interface SupportTicketData {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface FaqItem {
  category: string;
  question: string;
  summary: string;
  steps: string[];
}

const FAQS: FaqItem[] = [
  {
    category: "SMS & Gateway",
    question: "How do I configure our institute's BYOK SMS Gateway?",
    summary:
      "Connect your own SMS provider (MSG91, Textlocal, Fast2SMS) with approved TRAI DLT headers to send transactional SMS alerts directly to students and parents.",
    steps: [
      "1. Navigate to 'SMS Gateway (BYOK)' under Institute Setup in your sidebar.",
      "2. Choose your provider: Select MSG91, Textlocal, or Fast2SMS from the provider dropdown.",
      "3. Enter your TRAI DLT-approved 6-character Sender ID Header (e.g. VIDYAL) and paste your secret API Key / Auth Token.",
      "4. Map DLT Template IDs for automated transactional broadcasts (Fee due reminders, OTP verification, attendance alerts, exam schedules).",
      "5. Use the built-in 'Live Test SMS Dispatch' tool to send a live test message to your mobile number to verify active gateway delivery.",
    ],
  },
  {
    category: "Fees & Billing",
    question: "How do automated fee reminders and overdue alerts work?",
    summary:
      "The system runs automated background checks daily to notify students with pending or overdue fee installments over WhatsApp and Email.",
    steps: [
      "1. Automated Daily Checks: The system scans all student fee schedules daily at 8:00 AM to identify upcoming and overdue installments.",
      "2. Multi-Channel Reminders: Automated notifications with exact due amounts, installment due dates, and secure payment links are sent via WhatsApp and Email.",
      "3. Instant Manual Reminders: You can also trigger 1-click instant WhatsApp/SMS reminders anytime directly from the Students roster or Fees Ledger.",
      "4. Custom Grace Periods: Adjust reminder frequency, grace periods, and late penalty rules under Institute Settings > Billing.",
    ],
  },
  {
    category: "Certificates",
    question: "How do I design and issue student completion certificates?",
    summary:
      "Create branded certificate templates with dynamic placeholders and authorized signatures, then issue them individually or in bulk.",
    steps: [
      "1. Open 'Certificates' from the sidebar navigation menu.",
      "2. Click 'Create Certificate Template' to customize the border styling, background watermark, institute logo, and authorized signature stamp.",
      "3. Insert dynamic placeholders: Use {studentName}, {courseName}, {completionDate}, {certificateNumber}, and {instituteName}.",
      "4. Issue certificates individually from any student's profile, or bulk-generate them for an entire batch once their course duration is completed.",
      "5. Students can instantly view, verify, and download high-resolution PDF certificates directly from their Student Portal.",
    ],
  },
  {
    category: "Finance & Accounts",
    question: "How do I record extra non-fee income and operating expenses?",
    summary:
      "Track every financial inflow and outflow outside regular student tuition fees with complete Profit & Loss reporting.",
    steps: [
      "1. Operating Expenses: Go to 'Expenses' in the sidebar to log operational costs like building rent, staff salaries, electricity bills, books, and marketing spend with receipts and categories.",
      "2. Extra Non-Fee Income: Go to 'Extra Income' to record ancillary revenue streams like study material sales, uniform fees, classroom rentals, and registration charges.",
      "3. Profit & Loss (P&L) Reports: Open 'Reports & Analytics' to view real-time monthly revenue vs expense breakdowns, net margins, and download consolidated CSV spreadsheets.",
    ],
  },
  {
    category: "Student Portal",
    question: "How do students and parents access the Student Portal?",
    summary:
      "Students access their dedicated web portal at /portal using their registered mobile number or email with PIN authentication.",
    steps: [
      "1. Direct your students and parents to the portal login page at /portal on any mobile, tablet, or desktop browser.",
      "2. Students log in using their registered mobile number or email address along with their secure PIN (set by default during admission or updated by the student).",
      "3. Inside the portal, students can view class timetables, attendance percentage, test scores & rank cards, fee payment receipts, study materials & video lectures, live class links, assignments & DPPs, and download completion certificates.",
      "4. Course & Batch Switcher: Students enrolled in multiple courses can easily switch between course programs and batches.",
    ],
  },
  {
    category: "Multi-Branch",
    question: "How do I add and manage multiple branches under our institute?",
    summary:
      "Create independent branch campuses with their own faculty, batches, and budgets while retaining central head-office oversight.",
    steps: [
      "1. Navigate to 'Branches' in the sidebar navigation.",
      "2. Click 'Add Branch' and provide the Branch Name, Code, City, Address, and Branch Manager contact details.",
      "3. Assign faculty members, staff, batches, and classroom resources specifically to each branch campus.",
      "4. Institute Owners retain central head-office oversight with consolidated financial analytics, branch-wise student counts, and fee collection summaries.",
    ],
  },
  {
    category: "Live Classes & Study Material",
    question: "How do I schedule Live Classes and upload Study Material for specific courses and batches?",
    summary:
      "Publish live webinar links and lecture notes targeted by course program or institute-wide global broadcast.",
    steps: [
      "1. Live Classes: Go to 'Live Classes', click 'Schedule Live Class', select the Target Course Program, then pick specific batches or All Batches, and paste your Zoom/Google Meet/YouTube link.",
      "2. Study Material & Video Lectures: Go to 'Study Material', click 'Upload Material', select the Course Program, choose target Batches, and upload PDFs, notes, or embed video lecture URLs.",
    ],
  },
  {
    category: "Tests & Online Exams",
    question: "How do I create Tests and Online CBT Exams for multiple batches?",
    summary:
      "Create exams, configure question banks, set negative marking, and schedule tests across multiple batches of a course program in one step.",
    steps: [
      "1. Go to 'Tests & Assessments' and click 'Create Test / CBT Exam'.",
      "2. First select the Target Course Program, then select all batches in that course or specific individual batches (e.g. 2 out of 4).",
      "3. Configure test timing, total marks, passing marks, and syllabus description.",
      "4. Enable the 'Online CBT Test Engine' for timed MCQ exams with negative marking, auto-scoring, and instant student rank cards.",
    ],
  },
  {
    category: "Attendance & Timetable",
    question: "How do I mark Attendance and schedule Timetable classes by Course and Batch?",
    summary:
      "Take daily batch attendance and build weekly class schedules with flexible start and end timings.",
    steps: [
      "1. Attendance: Go to 'Attendance', select your Course Program, choose the Batch, select the date, mark students Present/Absent/Late with 1-click, and click Save Attendance.",
      "2. Timetable: Go to 'Timetable', click 'Add Class Slot', select the Course Program, choose the Batch, pick single or recurring days (Mon-Sat, Mon-Fri, All), and customize the Start and End times.",
    ],
  },
];

export function SupportView({
  userName,
  userEmail,
  instituteName,
}: {
  userName: string;
  userEmail: string;
  instituteName: string;
}) {
  // FAQs start in collapsed form by default; users can click to expand any FAQ
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([]);
  const [faqSearch, setFaqSearch] = useState("");
  const [tickets, setTickets] = useState<SupportTicketData[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // New ticket state
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Email copy state
  const [copiedEmail, setCopiedEmail] = useState(false);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const expandAllFaqs = () => {
    setOpenFaqIndices(FAQS.map((_, idx) => idx));
  };

  const collapseAllFaqs = () => {
    setOpenFaqIndices([]);
  };

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQS;
    const query = faqSearch.toLowerCase();
    return FAQS.filter(
      (f) =>
        f.question.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query) ||
        f.summary.toLowerCase().includes(query) ||
        f.steps.some((s) => s.toLowerCase().includes(query))
    );
  }, [faqSearch]);

  const supportPhone = "+919876543210";
  const supportPhoneDisplay = "+91 98765 43210";
  const supportEmail = "support@vidyalaya.io";

  const whatsappChatUrl = getWhatsAppWebUrl(
    supportPhone,
    `Hello Vidyalaya Support Team, I am reaching out from "${instituteName}" regarding our coaching platform account.`
  );

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support-tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch {
      console.error("Failed to load tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError("");
    setTicketSuccess(false);

    if (!subject.trim()) {
      setTicketError("Please enter a subject for your ticket.");
      return;
    }
    if (!description.trim()) {
      setTicketError("Please describe what you need help with.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create support ticket.");

      setTicketSuccess(true);
      setSubject("");
      setDescription("");
      fetchTickets();
      setTimeout(() => setTicketSuccess(false), 4000);
    } catch (err: unknown) {
      setTicketError(err instanceof Error ? err.message : "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "CLOSED":
        return "bg-scholar-100 text-scholar-700 border-scholar-200";
      default:
        return "bg-scholar-50 text-scholar-700 border-scholar-200";
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Hero Banner */}
      <div className="rounded-3xl border border-scholar-200 bg-gradient-to-br from-scholar-900 via-scholar-800 to-scholar-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-marigold-400 border border-white/10">
              <HelpCircle size={14} /> Official Vidyalaya Platform Support
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              How can we help your institute today?
            </h1>
            <p className="text-xs sm:text-sm text-scholar-200 max-w-xl">
              Get technical support, onboarding assistance, or billing help directly from the Vidyalaya platform team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={whatsappChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-600 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Chat on WhatsApp</span>
            </a>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold text-white border border-white/20 hover:bg-white/20 transition-all"
            >
              <Mail size={16} />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* Grid: Direct Contact Channels & Operational Hours */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* WhatsApp Channel */}
        <Card className="p-5 space-y-3 border-emerald-200/60 bg-emerald-50/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">WhatsApp Desk</h3>
              <p className="text-[11px] text-scholar-500">Fastest response for urgent queries</p>
            </div>
          </div>
          <p className="text-xs font-bold text-emerald-900">{supportPhoneDisplay}</p>
          <a
            href={whatsappChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            <span>Start WhatsApp Chat</span>
            <ExternalLink size={12} />
          </a>
        </Card>

        {/* Email Channel */}
        <Card className="p-5 space-y-3 border-blue-200/60 bg-blue-50/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">Email Support</h3>
              <p className="text-[11px] text-scholar-500">For account & technical tickets</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">{supportEmail}</span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1"
            >
              {copiedEmail ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedEmail ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
          >
            <span>Compose Email</span>
            <ExternalLink size={12} />
          </a>
        </Card>

        {/* Operating Hours */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-ink">Desk Availability</h3>
              <p className="text-[11px] text-scholar-500">IST Operating Schedule</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-scholar-700">
            <div className="flex justify-between">
              <span className="font-medium">Monday – Saturday</span>
              <span className="font-bold text-ink">9:00 AM – 7:00 PM</span>
            </div>
            <div className="flex justify-between text-scholar-500 text-[11px]">
              <span>Sunday & National Holidays</span>
              <span>Emergency tickets only</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Split: Ticket Form & FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Ticket Submission & Previous Tickets */}
        <div className="lg:col-span-7 space-y-6">
          {/* Create Ticket Card */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-scholar-100 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-100 text-scholar-700">
                <Ticket size={18} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">Submit a Support Ticket</h3>
                <p className="text-xs text-scholar-500">
                  Submitting as <strong>{userName}</strong> ({userEmail}) from <strong>{instituteName}</strong>
                </p>
              </div>
            </div>

            {ticketError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{ticketError}</span>
              </div>
            )}

            {ticketSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>Ticket submitted successfully! Our team will respond shortly.</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <Field label="Subject / Brief Summary">
                <input
                  type="text"
                  placeholder="e.g. Issue configuring MSG91 DLT template for fee reminders"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Detailed Description">
                <textarea
                  rows={4}
                  placeholder="Describe what you were trying to do, any error messages displayed, and steps to reproduce..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-scholar-400">
                  Institute ID & session credentials are automatically attached.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{submitting ? "Submitting..." : "Submit Ticket"}</span>
                </button>
              </div>
            </form>
          </Card>

          {/* Ticket History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                <Ticket size={15} className="text-scholar-600" />
                Your Institute&apos;s Tickets ({tickets.length})
              </h4>
            </div>

            {loadingTickets ? (
              <Card className="p-6 text-center text-xs text-scholar-500">
                <Loader2 size={16} className="animate-spin mx-auto mb-2 text-scholar-600" />
                <span>Loading your support tickets...</span>
              </Card>
            ) : tickets.length === 0 ? (
              <Card className="p-6 text-center text-xs text-scholar-500">
                No tickets submitted yet. Use the form above to raise an issue with our support team.
              </Card>
            ) : (
              <div className="space-y-2.5">
                {tickets.map((t) => (
                  <Card key={t.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-ink block">{t.subject}</span>
                        <div className="flex items-center gap-2 text-[11px] text-scholar-500 mt-0.5">
                          <span>Created {formatDate(new Date(t.createdAt))}</span>
                          {t.user && <span>• By {t.user.name}</span>}
                        </div>
                      </div>
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-scholar-700 bg-scholar-50/70 p-2.5 rounded-lg border border-scholar-100 whitespace-pre-wrap">
                      {t.description}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: FAQs Accordion */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <HelpCircle size={18} className="text-scholar-600" />
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-scholar-500">Instant answers to common platform questions.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllFaqs}
                className="text-[11px] font-semibold text-scholar-600 hover:text-scholar-800 underline cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-scholar-300">|</span>
              <button
                type="button"
                onClick={collapseAllFaqs}
                className="text-[11px] font-semibold text-scholar-600 hover:text-scholar-800 underline cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* FAQ Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search platform questions (e.g. SMS, Fees, Certificates, Branches)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-scholar-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <Card className="p-6 text-center text-xs text-scholar-500">
                No matching questions found for &ldquo;{faqSearch}&rdquo;. Try another search or submit a support ticket.
              </Card>
            ) : (
              filteredFaqs.map((faq) => {
                const originalIndex = FAQS.findIndex((f) => f.question === faq.question);
                const isOpen = openFaqIndices.includes(originalIndex);
                return (
                  <Card
                    key={faq.question}
                    className={`transition-all duration-200 border ${
                      isOpen
                        ? "border-scholar-300 bg-scholar-50/20 shadow-xs"
                        : "border-scholar-100 hover:border-scholar-300 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(originalIndex)}
                      className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer select-none group"
                      aria-expanded={isOpen}
                    >
                      <div className="space-y-1 pr-2">
                        <span className="inline-block rounded-md bg-scholar-100 px-2 py-0.5 text-[10px] font-bold text-scholar-700">
                          {faq.category}
                        </span>
                        <h4 className="text-xs font-bold text-ink group-hover:text-scholar-800 transition-colors">
                          {faq.question}
                        </h4>
                      </div>
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all ${
                          isOpen
                            ? "border-scholar-300 bg-scholar-100 text-scholar-700 shadow-2xs"
                            : "border-scholar-200 bg-white text-scholar-400 group-hover:border-scholar-300 group-hover:text-scholar-600"
                        }`}
                      >
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-scholar-700 leading-relaxed border-t border-scholar-100/80 pt-3 space-y-2.5">
                        <p className="font-medium text-scholar-800 bg-scholar-50/80 p-2.5 rounded-lg border border-scholar-100/60">
                          {faq.summary}
                        </p>
                        <div className="space-y-1.5 pl-1">
                          {faq.steps.map((step, sIdx) => (
                            <p key={sIdx} className="text-scholar-600 text-[11px] leading-normal flex items-start gap-2">
                              <span>{step}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
