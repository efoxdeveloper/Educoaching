"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Building2,
  Calendar,
  GitBranch,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  Phone,
  MapPin,
  FileText,
  Lock,
  Mail,
  Sparkles,
  AlertCircle,
  X,
  IndianRupee,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";

interface SubBranchItem {
  name: string;
  inChargeName: string;
  address: string;
  city: string;
  state: string;
  contact: string;
  guidePhone: string;
  email: string;
  password: string;
}

interface CourseItem {
  name: string;
  code: string;
  fee: number | string;
  durationMonths: number;
  feeType: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
  academicYear?: string;
}

interface InstituteSetupWizardProps {
  instituteName: string;
  ownerName: string;
  initialAddress?: string | null;
  initialCity?: string | null;
  initialState?: string | null;
  initialGuidePhone?: string | null;
  initialAcademicYearLabel?: string | null;
  initialTaxNumber?: string | null;
  onComplete?: () => void;
}

const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function InstituteSetupWizard({
  instituteName,
  ownerName,
  initialAddress = "",
  initialCity = "",
  initialState = "",
  initialGuidePhone = "",
  initialAcademicYearLabel = "",
  initialTaxNumber = "",
  onComplete,
}: InstituteSetupWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Campus & Branding
  const [address, setAddress] = useState(initialAddress || "");
  const [city, setCity] = useState(initialCity || "");
  const [state, setState] = useState(initialState || "");
  const [guidePhone, setGuidePhone] = useState(initialGuidePhone || "");
  const [taxNumber, setTaxNumber] = useState(initialTaxNumber || "");
  const [logo, setLogo] = useState<{
    file: File | null;
    previewUrl: string | null;
    fileName: string;
    mimeType: string;
    base64: string;
  } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Academic Session (Manual Input)
  const [academicYearLabel, setAcademicYearLabel] = useState(initialAcademicYearLabel || "");

  // Step 3: Sub-Branches
  const [branches, setBranches] = useState<SubBranchItem[]>([]);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranchIndex, setEditingBranchIndex] = useState<number | null>(null);
  const [newBranch, setNewBranch] = useState<SubBranchItem>({
    name: "",
    inChargeName: "",
    address: "",
    city: "",
    state: "",
    contact: "",
    guidePhone: "",
    email: "",
    password: "",
  });
  const [showBranchPassword, setShowBranchPassword] = useState(false);

  // Step 4: Initial Courses
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);
  const [newCourse, setNewCourse] = useState<CourseItem>({
    name: "",
    code: "",
    fee: "",
    durationMonths: 12,
    feeType: "ONE_TIME",
    academicYear: "",
  });

  // UI status
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const handleLogoFile = (file: File) => {
    setError("");
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError("Logo must be a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be under 10MB in size.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogo({
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        mimeType: file.type,
        base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEditBranch = (index: number) => {
    setEditingBranchIndex(index);
    setNewBranch({ ...branches[index] });
    setIsAddingBranch(true);
    setError("");
  };

  const handleCancelBranch = () => {
    setIsAddingBranch(false);
    setEditingBranchIndex(null);
    setNewBranch({
      name: "",
      inChargeName: "",
      address: "",
      city: "",
      state: "",
      contact: "",
      guidePhone: "",
      email: "",
      password: "",
    });
    setError("");
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name.trim()) {
      setError("Sub-branch name is required.");
      return;
    }
    if (!newBranch.inChargeName.trim()) {
      setError("Branch In-Charge Name is required.");
      return;
    }
    if (editingBranchIndex !== null) {
      setBranches((prev) => prev.map((b, i) => (i === editingBranchIndex ? { ...newBranch } : b)));
      setEditingBranchIndex(null);
    } else {
      setBranches((prev) => [...prev, { ...newBranch }]);
    }
    setNewBranch({
      name: "",
      inChargeName: "",
      address: "",
      city: "",
      state: "",
      contact: "",
      guidePhone: "",
      email: "",
      password: "",
    });
    setIsAddingBranch(false);
    setError("");
  };

  const handleEditCourse = (index: number) => {
    setEditingCourseIndex(index);
    setNewCourse({ ...courses[index] });
    setIsAddingCourse(true);
    setError("");
  };

  const handleCancelCourse = () => {
    setIsAddingCourse(false);
    setEditingCourseIndex(null);
    setNewCourse({
      name: "",
      code: "",
      fee: "",
      durationMonths: 12,
      feeType: "ONE_TIME",
      academicYear: academicYearLabel || "2026-2027",
    });
    setError("");
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name.trim()) {
      setError("Course name is required.");
      return;
    }
    if (newCourse.fee === "" || newCourse.fee === undefined) {
      setError("Please specify a course fee.");
      return;
    }
    const feeNum = Number(newCourse.fee);
    if (isNaN(feeNum) || feeNum < 0) {
      setError("Please enter a valid course fee amount.");
      return;
    }

    const itemToSave: CourseItem = {
      ...newCourse,
      fee: feeNum,
      academicYear: newCourse.academicYear?.trim() || academicYearLabel || "2026-2027",
    };

    if (editingCourseIndex !== null) {
      setCourses((prev) => prev.map((c, i) => (i === editingCourseIndex ? itemToSave : c)));
      setEditingCourseIndex(null);
    } else {
      setCourses((prev) => [...prev, itemToSave]);
    }

    setNewCourse({
      name: "",
      code: "",
      fee: "",
      durationMonths: 12,
      feeType: "ONE_TIME",
      academicYear: academicYearLabel || "2026-2027",
    });
    setIsAddingCourse(false);
    setError("");
  };

  const handleSaveSetup = async () => {
    setError("");
    setSaving(true);

    try {
      const payload = {
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        guidePhone: guidePhone.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        academicYearLabel: academicYearLabel.trim() || undefined,
        logo: logo ? { fileName: logo.fileName, mimeType: logo.mimeType, base64: logo.base64 } : undefined,
        branches: branches.length > 0 ? branches : undefined,
        courses: courses.length > 0 ? courses : undefined,
      };

      const res = await fetch("/api/institutes/me/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete setup.");
      }

      setIsOpen(false);
      if (onComplete) {
        onComplete();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    setIsOpen(false);
    try {
      await fetch("/api/institutes/me/setup/dismiss", { method: "POST" });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    { num: 1, title: "Main Branch", icon: Building2 },
    { num: 2, title: "Academic Session", icon: Calendar },
    { num: 3, title: "Sub-Branches", icon: GitBranch },
    { num: 4, title: "Courses & Fees", icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Full-screen backdrop blur and dark overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-all"
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-4xl flex-col rounded-2xl border border-scholar-200 bg-white shadow-popover max-h-[92vh] overflow-hidden">
        {/* Header with Progress Steps */}
        <div className="border-b border-scholar-100 bg-scholar-50/70 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-700 text-white">
                <GraduationCap size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink">
                    Welcome, {ownerName}!
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    Access Granted
                  </span>
                </div>
                <p className="text-xs text-scholar-500">
                  Let&apos;s configure your institute setup for <strong>{instituteName}</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-scholar-400 hover:text-scholar-700 transition"
              title="Skip setup for now"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper navigation */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isDone = currentStep > s.num;
              const isCurrent = currentStep === s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num as 1 | 2 | 3 | 4)}
                  className={`flex items-center gap-2 rounded-xl p-2 text-left transition-all border ${
                    isCurrent
                      ? "border-scholar-500 bg-white shadow-2xs text-scholar-900"
                      : isDone
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                      : "border-transparent text-scholar-400 hover:text-scholar-700"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-scholar-700 text-white"
                        : "bg-scholar-200 text-scholar-600"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={13} /> : <Icon size={12} />}
                  </div>
                  <div className="hidden sm:block truncate">
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                      Step {s.num}
                    </p>
                    <p className="text-xs font-bold truncate leading-tight">{s.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Body Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Main Branch Location & Branding */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-scholar-100 pb-3">
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <Building2 size={16} className="text-scholar-600" />
                  Main Branch Address &amp; Branding Profile
                </h3>
                <p className="text-xs text-scholar-500 mt-0.5">
                  Set the physical location of your Main Branch and upload your coaching center logo.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-ink">
                    Physical Branch Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 104, Education Hub, Near Metro Pillar 42"
                    className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-scholar-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Kota / Delhi / Jaipur"
                    className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-scholar-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">State / Region</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-scholar-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">
                    Admission Helpline / Support Phone
                  </label>
                  <input
                    type="tel"
                    value={guidePhone}
                    onChange={(e) => setGuidePhone(e.target.value)}
                    placeholder="e.g. 011-23456789 or 9876543210"
                    className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-scholar-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">
                    GSTIN / Tax Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="e.g. 08AAAAA0000A1Z5"
                    className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-scholar-500"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="pt-2">
                <label className="mb-1.5 block text-xs font-semibold text-ink">
                  Institute Logo
                </label>
                {logo?.previewUrl ? (
                  <div className="flex items-center gap-4 rounded-xl border border-scholar-200 bg-scholar-50/50 p-3">
                    <img
                      src={logo.previewUrl}
                      alt="Logo preview"
                      className="h-14 w-14 rounded-lg object-contain bg-white border border-scholar-200 p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{logo.fileName}</p>
                      <p className="text-[11px] text-emerald-600 font-medium">Ready to save</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (logo.previewUrl) URL.revokeObjectURL(logo.previewUrl);
                        setLogo(null);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-scholar-200 bg-scholar-50/30 p-6 text-center hover:bg-scholar-50/60 cursor-pointer transition"
                  >
                    <Upload size={24} className="text-scholar-400 mb-2" />
                    <p className="text-xs font-bold text-scholar-800">
                      Click to upload coaching logo
                    </p>
                    <p className="text-[11px] text-scholar-400 mt-0.5">
                      PNG, JPG or WEBP (Max 10MB)
                    </p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoFile(f);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Academic Session Configuration (Manual Input) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-scholar-100 pb-3">
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <Calendar size={16} className="text-scholar-600" />
                  Academic Session Configuration (Manual Input)
                </h3>
                <p className="text-xs text-scholar-500 mt-0.5">
                  Input your active academic session manually. There is no automatic session assignment.
                </p>
              </div>

              <div className="rounded-xl border border-scholar-200 bg-white p-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink">
                    Current Academic Session / Year Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={academicYearLabel}
                    onChange={(e) => setAcademicYearLabel(e.target.value)}
                    placeholder="e.g. 2026-2027 or 2026-27 or Session 2026-27"
                    className="w-full rounded-xl border border-scholar-300 bg-white px-3.5 py-2.5 text-xs text-ink outline-none focus:border-scholar-600 focus:ring-2 focus:ring-scholar-100 font-medium"
                  />
                  <p className="mt-1.5 text-[11px] text-scholar-500 leading-relaxed">
                    This manual session label will appear across student admit cards, enrollment records, batch schedules, report cards, and fee receipts.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] font-semibold text-scholar-400 self-center">
                    Quick suggestions:
                  </span>
                  {["2026-27", "2026-2027", "Session 2026-27", "Batch 2026-2027"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAcademicYearLabel(preset)}
                      className="rounded-lg border border-scholar-200 bg-scholar-50 px-2.5 py-1 text-[11px] font-bold text-scholar-700 hover:bg-scholar-100 hover:border-scholar-300 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Sub-Branches */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-scholar-100 pb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                    <GitBranch size={16} className="text-scholar-600" />
                    Sub-Branches
                  </h3>
                  <p className="text-xs text-scholar-500 mt-0.5">
                    Your Main Branch is already created. Add any additional satellite branches if applicable.
                  </p>
                </div>
                {!isAddingBranch && (
                  <button
                    type="button"
                    onClick={() => setIsAddingBranch(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-scholar-700 shadow-2xs transition"
                  >
                    <Plus size={14} />
                    <span>Add Sub-Branch</span>
                  </button>
                )}
              </div>

              {/* Main branch tile */}
              <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-200 text-scholar-800 font-bold text-xs">
                    MB
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-ink">{instituteName} (Main Branch)</p>
                      <span className="rounded bg-scholar-200/80 px-1.5 py-0.2 text-[10px] font-bold text-scholar-800">
                        Primary Branch
                      </span>
                    </div>
                    <p className="text-[11px] text-scholar-500">
                      {city ? `${city}, ${state}` : "Location configured in Step 1"}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">Active</span>
              </div>

              {/* Sub-branches list */}
              {branches.length > 0 && (
                <div className="space-y-2">
                  {branches.map((b, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-scholar-200 bg-white p-3.5 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-ink">{b.name}</p>
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                            Pending Verification
                          </span>
                        </div>
                        <p className="text-[11px] text-scholar-500 mt-0.5">
                          <span className="font-semibold text-ink">In-Charge: {b.inChargeName}</span> • {b.city ? `${b.city}, ${b.state}` : "No address specified"} • Admin: {b.email || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditBranch(idx)}
                          className="text-scholar-400 hover:text-scholar-700 transition p-1"
                          title="Edit branch"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingBranchIndex === idx) handleCancelBranch();
                            setBranches(branches.filter((_, i) => i !== idx));
                          }}
                          className="text-scholar-400 hover:text-rose-600 transition p-1"
                          title="Remove branch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit branch form modal/block */}
              {isAddingBranch && (
                <form onSubmit={handleAddBranch} className="rounded-xl border border-scholar-300 bg-scholar-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink">
                      {editingBranchIndex !== null ? "Edit Sub-Branch Details" : "New Sub-Branch Details"}
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelBranch}
                      className="text-scholar-400 hover:text-ink"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">
                        Branch Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newBranch.name}
                        onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                        placeholder="e.g. South Extension Branch"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">
                        Branch In-Charge Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newBranch.inChargeName}
                        onChange={(e) => setNewBranch({ ...newBranch, inChargeName: e.target.value })}
                        placeholder="e.g. Prof. Arvind Saxena"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">City</label>
                      <input
                        type="text"
                        value={newBranch.city}
                        onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                        placeholder="e.g. New Delhi"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Branch Contact</label>
                      <input
                        type="tel"
                        value={newBranch.contact}
                        onChange={(e) => setNewBranch({ ...newBranch, contact: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Branch Incharge Email</label>
                      <input
                        type="email"
                        value={newBranch.email}
                        onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                        placeholder="branch@apexcoaching.com"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Branch Incharge Password</label>
                      <div className="flex items-center gap-1.5 rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 focus-within:border-scholar-500">
                        <input
                          type={showBranchPassword ? "text" : "password"}
                          value={newBranch.password}
                          onChange={(e) => setNewBranch({ ...newBranch, password: e.target.value })}
                          placeholder="Min 8 characters"
                          className="w-full bg-transparent text-xs text-ink outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBranchPassword(!showBranchPassword)}
                          className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                          aria-label={showBranchPassword ? "Hide password" : "Show password"}
                        >
                          {showBranchPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelBranch}
                      className="rounded-lg border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-scholar-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-scholar-800"
                    >
                      {editingBranchIndex !== null ? "Update Sub-Branch" : "Save Sub-Branch"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STEP 4: Initial Courses Starter */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-scholar-100 pb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                    <BookOpen size={16} className="text-scholar-600" />
                    Initial Academic Courses (Optional)
                  </h3>
                  <p className="text-xs text-scholar-500 mt-0.5">
                    Add starting academic courses now or add them later from the Courses section.
                  </p>
                </div>
                {!isAddingCourse && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCourse(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-scholar-700 shadow-2xs transition"
                  >
                    <Plus size={14} />
                    <span>Add Course</span>
                  </button>
                )}
              </div>

              {courses.length > 0 ? (
                <div className="space-y-2">
                  {courses.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-scholar-200 bg-white p-3.5 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-ink">{c.name}</p>
                          {c.code && (
                            <span className="rounded bg-scholar-100 px-1.5 py-0.2 text-[10px] font-bold text-scholar-700">
                              {c.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-scholar-500 mt-0.5">
                          Fee: ₹{Number(c.fee).toLocaleString("en-IN")} • Duration: {c.durationMonths} months • {c.feeType}
                          {c.academicYear && <span> • Session: {c.academicYear}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditCourse(idx)}
                          className="text-scholar-400 hover:text-scholar-700 transition p-1"
                          title="Edit course"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingCourseIndex === idx) handleCancelCourse();
                            setCourses(courses.filter((_, i) => i !== idx));
                          }}
                          className="text-scholar-400 hover:text-rose-600 transition p-1"
                          title="Remove course"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-scholar-200 bg-scholar-50/50 p-6 text-center">
                  <BookOpen size={24} className="mx-auto text-scholar-400 mb-2" />
                  <p className="text-xs font-bold text-scholar-800">No courses added yet</p>
                  <p className="text-[11px] text-scholar-500 mt-0.5">
                    You can add initial coaching courses now or configure them later.
                  </p>
                </div>
              )}

              {/* Add/Edit course form */}
              {isAddingCourse && (
                <form onSubmit={handleAddCourse} className="rounded-xl border border-scholar-300 bg-scholar-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink">
                      {editingCourseIndex !== null ? "Edit Course Details" : "New Course Starter"}
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelCourse}
                      className="text-scholar-400 hover:text-ink"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold text-ink">
                        Course Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        placeholder="e.g. JEE Advanced 2-Year Program"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Course Code / Short Name</label>
                      <input
                        type="text"
                        value={newCourse.code}
                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                        placeholder="e.g. JEE-ADV-26"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Academic Session / Year</label>
                      <input
                        type="text"
                        value={newCourse.academicYear || ""}
                        onChange={(e) => setNewCourse({ ...newCourse, academicYear: e.target.value })}
                        placeholder={academicYearLabel || "e.g. 2026-2027"}
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">
                        Total Target Fee (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={newCourse.fee}
                        onChange={(e) => setNewCourse({ ...newCourse, fee: e.target.value === "" ? "" : Number(e.target.value) })}
                        placeholder="e.g. 25000"
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Duration (Months)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={newCourse.durationMonths}
                        onChange={(e) => setNewCourse({ ...newCourse, durationMonths: Number(e.target.value) || 12 })}
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold text-ink">Billing Mode</label>
                      <select
                        value={newCourse.feeType}
                        onChange={(e) => setNewCourse({ ...newCourse, feeType: e.target.value as any })}
                        className="w-full rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-scholar-500"
                      >
                        <option value="ONE_TIME">One Time Full Fee</option>
                        <option value="MONTHLY">Monthly Billing</option>
                        <option value="QUARTERLY">Quarterly Billing</option>
                        <option value="ANNUAL">Annual Billing</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelCourse}
                      className="rounded-lg border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-scholar-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-scholar-800"
                    >
                      {editingCourseIndex !== null ? "Update Course" : "Save Course"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="border-t border-scholar-100 bg-scholar-50/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
                className="flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition shadow-2xs"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-scholar-400 hover:text-scholar-700 hover:underline"
            >
              Skip setup for now
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4)}
                className="flex items-center gap-1.5 rounded-xl bg-scholar-700 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-800 transition shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSetup}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  <span>Saving Setup...</span>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Complete Setup &amp; Launch</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
