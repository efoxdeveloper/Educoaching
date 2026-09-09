"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2, Upload, Check, Eye } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";

export type CertificateTemplateData = {
  id?: string;
  name: string;
  title: string;
  bodyText: string;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  logoFileAssetId?: string | null;
  signatureFileAssetId?: string | null;
  style?: string | null;
};

const DEFAULT_BODY =
  "This is to certify that {studentName} has successfully completed the course {courseName} on {completionDate} at {instituteName}.";

type DesignPreset = {
  id: string;
  name: string;
  desc: string;
  primary: string;
  secondary: string;
  lightBorder: string;
  bg: string;
};

const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "classic-blue",
    name: "Classic Blue",
    desc: "Navy & gold border, formal",
    primary: "#1E3A8A",
    secondary: "#D97706",
    lightBorder: "#CBD5E1",
    bg: "#F8FAFC",
  },
  {
    id: "elegant-gold",
    name: "Elegant Gold",
    desc: "Warm amber & gold, premium",
    primary: "#92400E",
    secondary: "#D97706",
    lightBorder: "#FDE68A",
    bg: "#FFFBEB",
  },
  {
    id: "minimal-grey",
    name: "Minimal Grey",
    desc: "Clean slate & grey, modern",
    primary: "#334155",
    secondary: "#64748B",
    lightBorder: "#E2E8F0",
    bg: "#F8FAFC",
  },
];

export function TemplateEditorDrawer({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template?: CertificateTemplateData | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(template?.name || "");
  const [title, setTitle] = useState(template?.title || "Certificate of Completion");
  const [bodyText, setBodyText] = useState(template?.bodyText || DEFAULT_BODY);
  const [signatoryName, setSignatoryName] = useState(template?.signatoryName || "Authorized Signatory");
  const [signatoryTitle, setSignatoryTitle] = useState(template?.signatoryTitle || "Director / Academic Head");
  const [logoFileAssetId, setLogoFileAssetId] = useState<string | null>(
    (template as any)?.logoFileAssetId || null
  );
  const [style, setStyle] = useState<string>((template as any)?.style || "classic-blue");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setTitle(template.title);
      setBodyText(template.bodyText);
      setSignatoryName(template.signatoryName || "Authorized Signatory");
      setSignatoryTitle(template.signatoryTitle || "Director / Academic Head");
      setLogoFileAssetId((template as any).logoFileAssetId || null);
      setStyle((template as any).style || "classic-blue");
    } else {
      setName("");
      setTitle("Certificate of Completion");
      setBodyText(DEFAULT_BODY);
      setSignatoryName("Authorized Signatory");
      setSignatoryTitle("Director / Academic Head");
      setLogoFileAssetId(null);
      setStyle("classic-blue");
    }
    // cleanup preview url on template change
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Debounced preview regeneration — 600ms after user stops typing
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/certificates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            bodyText,
            signatoryName,
            signatoryTitle,
            logoFileAssetId,
            style,
          }),
        });
        if (!res.ok) throw new Error("Preview failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // silent fail for preview — don't show error, just keep old preview
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, title, bodyText, signatoryName, signatoryTitle, logoFileAssetId, style]);

  const insertTag = (tag: string) => {
    setBodyText((prev) => `${prev} ${tag}`);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "INSTITUTE_LOGO");
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo");
      setLogoFileAssetId(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please provide a template name.");
      return;
    }
    setLoading(true);
    try {
      const isEditing = Boolean(template?.id);
      const url = isEditing ? `/api/certificates/templates/${template?.id}` : "/api/certificates/templates";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim(),
          bodyText: bodyText.trim(),
          signatoryName: signatoryName.trim(),
          signatoryTitle: signatoryTitle.trim(),
          logoFileAssetId,
          style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save certificate template.");
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={template?.id ? "Edit Certificate Template" : "Design New Certificate Template"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700">{error}</div>}

        <Field label="Template Name (Internal Reference)">
          <input required className={inputClass} placeholder="e.g. Standard Course Completion Certificate" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Certificate Main Title (Printed on Certificate)">
          <input required className={inputClass} placeholder="e.g. Certificate of Completion / Academic Excellence" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-scholar-700">Certificate Body Text & Dynamic Placeholders</label>
          <textarea rows={4} required className={inputClass} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-scholar-500 font-medium mr-1">Insert Variable:</span>
            {[
              { tag: "{studentName}", label: "Student Name" },
              { tag: "{courseName}", label: "Course Name" },
              { tag: "{completionDate}", label: "Completion Date" },
              { tag: "{instituteName}", label: "Institute Name" },
              { tag: "{admissionDate}", label: "Admission Date" },
            ].map((v) => (
              <button key={v.tag} type="button" onClick={() => insertTag(v.tag)} className="rounded-lg border border-scholar-200 bg-scholar-50 px-2 py-0.5 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors">
                + {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Signatory Name">
            <input className={inputClass} placeholder="e.g. Dr. Rajesh Khanna" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
          </Field>
          <Field label="Signatory Designation / Title">
            <input className={inputClass} placeholder="e.g. Academic Dean / Managing Director" value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink">Institute Logo (optional, small)</span>
              <p className="text-[11px] text-scholar-500">Shown at top of certificate — not full-bleed background.</p>
            </div>
            {logoFileAssetId && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"><Check size={12} /> Attached</span>}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} accept="image/png, image/jpeg" onChange={handleLogoUpload} className="hidden" />
            <button type="button" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors">
              {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              <span>{logoFileAssetId ? "Change Logo" : "Upload Logo"}</span>
            </button>
            {logoFileAssetId && <button type="button" onClick={() => setLogoFileAssetId(null)} className="text-xs text-danger-600 hover:underline font-semibold">Remove</button>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink">Design Preset</label>
          <div className="grid grid-cols-3 gap-2">
            {DESIGN_PRESETS.map((preset) => {
              const isSelected = style === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStyle(preset.id)}
                  className={`relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left transition-all ${isSelected ? "border-scholar-800 bg-scholar-50 shadow-sm" : "border-scholar-200 bg-white hover:border-scholar-300 hover:bg-scholar-50/50"}`}
                >
                  <div className="flex w-full items-center gap-1.5">
                    <div className="h-8 w-12 rounded-md border shadow-sm flex overflow-hidden" style={{ borderColor: preset.lightBorder, background: preset.bg }}>
                      <div className="flex-1 border-r" style={{ background: preset.primary, opacity: 0.15 }} />
                      <div className="flex-1" style={{ background: preset.secondary, opacity: 0.15 }} />
                    </div>
                    {isSelected && <Check size={14} className="ml-auto text-scholar-700" />}
                  </div>
                  <div className="w-12 h-1.5 rounded-full" style={{ background: preset.primary }} />
                  <div className="w-8 h-1.5 rounded-full" style={{ background: preset.secondary }} />
                  <span className="text-xs font-bold text-ink">{preset.name}</span>
                  <span className="text-[11px] leading-tight text-scholar-500">{preset.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-scholar-200 bg-white p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5"><Eye size={14} /> Live Preview — exact PDF output</span>
            {previewLoading && <span className="flex items-center gap-1 text-[11px] text-scholar-500"><Loader2 size={12} className="animate-spin" /> Updating…</span>}
          </div>
          <p className="text-[11px] text-scholar-500">Preview uses real PDFKit rendering with dummy data: <strong>Aarav Sharma</strong> • Full Stack Web Development • today • CERT-DEMO01. Debounced 600ms.</p>
          <div className="overflow-hidden rounded-xl border bg-scholar-50 shadow-sm">
            {previewUrl ? (
              <iframe src={previewUrl} title="Certificate preview" className="h-[420px] w-full bg-white" />
            ) : (
              <div className="flex h-[420px] w-full items-center justify-center bg-white text-xs text-scholar-400">
                {previewLoading ? "Generating preview…" : "Preview will appear here"}
              </div>
            )}
          </div>
          <p className="text-[10px] text-scholar-400">A4 landscape 841.89×595.28pt — not an approximation.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
          <span className="font-bold">Check carefully before saving:</span> the preview above is the exact certificate your students will receive. Dragging or pixel coordinates are no longer needed — the layout is fully automatic.
        </div>

        <div className="pt-2 flex items-center gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-bold text-white hover:bg-scholar-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
            <span>{loading ? "Saving..." : "Looks good, save template"}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
