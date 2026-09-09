"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2, Upload, Check } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";

export type CertificateFieldPos = { key: string; x: number; y: number; fontSize?: number; align?: "left" | "center" | "right"; color?: string; customText?: string };

export type CertificateTemplateData = {
  id?: string;
  name: string;
  title: string;
  bodyText: string;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  logoFileAssetId?: string | null;
  signatureFileAssetId?: string | null;
  backgroundImageAssetId?: string | null;
  fieldPositions?: CertificateFieldPos[] | null;
};

const DEFAULT_BODY =
  "This is to certify that {studentName} has successfully completed the course {courseName} on {completionDate} at {instituteName}.";

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
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(template?.name || "");
  const [title, setTitle] = useState(template?.title || "Certificate of Completion");
  const [bodyText, setBodyText] = useState(template?.bodyText || DEFAULT_BODY);
  const [signatoryName, setSignatoryName] = useState(template?.signatoryName || "Authorized Signatory");
  const [signatoryTitle, setSignatoryTitle] = useState(template?.signatoryTitle || "Director / Academic Head");
  const [signatureFileAssetId, setSignatureFileAssetId] = useState<string | null>(
    template?.signatureFileAssetId || null
  );
  const [backgroundImageAssetId, setBackgroundImageAssetId] = useState<string | null>(
    (template as any)?.backgroundImageAssetId || null
  );
  const [fieldPositions, setFieldPositions] = useState<CertificateFieldPos[]>(
    (template as any)?.fieldPositions || []
  );
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [bgNaturalSize, setBgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [samplePdfUrl, setSamplePdfUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // A4 landscape 841.89 x 595.28 => ratio 1.414
  const PDF_W = 841.89;
  const PDF_H = 595.28;
  const PREVIEW_W = 700;
  const PREVIEW_H = 495;
  const SCALE = PREVIEW_W / PDF_W;

  const getSampleText = (key: string, customText?: string) => {
    const map: Record<string, string> = {
      studentName: "Aarav Sharma",
      courseName: "Full Stack Development",
      completionDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      certificateId: "CERT-DEMO01",
      instituteName: "Vidyalaya Institute",
      admissionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      certificateTitle: title || "Certificate of Completion",
      signatoryName: signatoryName || "Authorized Signatory",
      signatoryTitle: signatoryTitle || "Director / Academic Head",
    };
    if (customText) {
      let t = customText;
      Object.entries(map).forEach(([k, v]) => {
        t = t.replace(new RegExp(`\\{${k}\\}`, "gi"), v);
      });
      return t || customText;
    }
    return map[key] ?? key;
  };

  const handleGenerateSample = async () => {
    setGeneratingPreview(true);
    setSamplePdfUrl(null);
    try {
      const res = await fetch("/api/certificates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bodyText,
          signatoryName,
          signatoryTitle,
          backgroundImageAssetId,
          fieldPositions,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate preview");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setSamplePdfUrl(url);
      // also open in new tab as fallback
      // window.open(url, "_blank");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setGeneratingPreview(false);
    }
  };

  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setTitle(template.title);
      setBodyText(template.bodyText);
      setSignatoryName(template.signatoryName || "Authorized Signatory");
      setSignatoryTitle(template.signatoryTitle || "Director / Academic Head");
      setSignatureFileAssetId(template.signatureFileAssetId || null);
      setBackgroundImageAssetId((template as any).backgroundImageAssetId || null);
      setFieldPositions((template as any).fieldPositions || []);
      if ((template as any).backgroundImageAssetId) setBgPreviewUrl(`/api/files/${(template as any).backgroundImageAssetId}`);
      else setBgPreviewUrl(null);
      setBgNaturalSize(null);
      setSamplePdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } else {
      setName("");
      setTitle("Certificate of Completion");
      setBodyText(DEFAULT_BODY);
      setSignatoryName("Authorized Signatory");
      setSignatoryTitle("Director / Academic Head");
      setSignatureFileAssetId(null);
      setBackgroundImageAssetId(null);
      setFieldPositions([]);
      setBgPreviewUrl(null);
      setBgNaturalSize(null);
      setSamplePdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [template, open]);

  useEffect(() => {
    return () => {
      if (samplePdfUrl) URL.revokeObjectURL(samplePdfUrl);
    };
  }, [samplePdfUrl]);

  const insertTag = (tag: string) => {
    setBodyText((prev) => `${prev} ${tag}`);
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSig(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "SIGNATURE");

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload signature image");

      setSignatureFileAssetId(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload signature image");
    } finally {
      setUploadingSig(false);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "CERTIFICATE");
      const res = await fetch("/api/files", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload background image");
      setBackgroundImageAssetId(data.id);
      setBgPreviewUrl(`/api/files/${data.id}`);
      // add default field positions if empty
      if (fieldPositions.length === 0) {
        setFieldPositions([
          { key: "studentName", x: 420, y: 200, fontSize: 26, align: "center" },
          { key: "courseName", x: 420, y: 250, fontSize: 14, align: "center" },
          { key: "completionDate", x: 60, y: 500, fontSize: 10, align: "left" },
          { key: "certificateId", x: 60, y: 520, fontSize: 8, align: "left" },
        ]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload background image");
    } finally {
      setUploadingBg(false);
    }
  };

  const addField = () => {
    setFieldPositions((prev) => [...prev, { key: "studentName", x: 100, y: 100, fontSize: 14, align: "left" }]);
  };
  const updateField = (idx: number, patch: Partial<CertificateFieldPos>) => {
    setFieldPositions((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeField = (idx: number) => setFieldPositions((prev) => prev.filter((_, i) => i !== idx));

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
      const url = isEditing
        ? `/api/certificates/templates/${template?.id}`
        : "/api/certificates/templates";
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
          signatureFileAssetId,
          backgroundImageAssetId,
          fieldPositions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save certificate template.");
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={template?.id ? "Edit Certificate Template" : "Design New Certificate Template"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700">
            {error}
          </div>
        )}

        <Field label="Template Name (Internal Reference)">
          <input
            required
            className={inputClass}
            placeholder="e.g. Standard Course Completion Certificate"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Certificate Main Title (Printed on Certificate)">
          <input
            required
            className={inputClass}
            placeholder="e.g. Certificate of Completion / Academic Excellence"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-scholar-700">
            Certificate Body Text & Dynamic Placeholders
          </label>
          <textarea
            rows={4}
            required
            className={inputClass}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-scholar-500 font-medium mr-1">Insert Variable:</span>
            {[
              { tag: "{studentName}", label: "Student Name" },
              { tag: "{courseName}", label: "Course Name" },
              { tag: "{completionDate}", label: "Completion Date" },
              { tag: "{instituteName}", label: "Institute Name" },
              { tag: "{admissionDate}", label: "Admission Date" },
            ].map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertTag(v.tag)}
                className="rounded-lg border border-scholar-200 bg-scholar-50 px-2 py-0.5 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors"
              >
                + {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Signatory Name">
            <input
              className={inputClass}
              placeholder="e.g. Dr. Rajesh Khanna"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
            />
          </Field>

          <Field label="Signatory Designation / Title">
            <input
              className={inputClass}
              placeholder="e.g. Academic Dean / Managing Director"
              value={signatoryTitle}
              onChange={(e) => setSignatoryTitle(e.target.value)}
            />
          </Field>
        </div>

        {/* Signature Stamp Upload */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink">Authorized Signature Image (PNG/JPG)</span>
              <p className="text-[11px] text-scholar-500">Transparent PNG signature works best.</p>
            </div>
            {signatureFileAssetId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Check size={12} /> Attached
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg"
              onChange={handleSignatureUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingSig}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors"
            >
              {uploadingSig ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              <span>{signatureFileAssetId ? "Change Signature" : "Upload Signature Image"}</span>
            </button>
            {signatureFileAssetId && (
              <button
                type="button"
                onClick={() => setSignatureFileAssetId(null)}
                className="text-xs text-danger-600 hover:underline font-semibold"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Background Image Upload */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink">Background Template Image (PNG/JPG)</span>
              <p className="text-[11px] text-scholar-500">Upload a full ready-made certificate design — fields will overlay on it.</p>
            </div>
            {backgroundImageAssetId && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"><Check size={12} /> Attached</span>}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={bgInputRef} accept="image/png, image/jpeg" onChange={handleBackgroundUpload} className="hidden" />
            <button type="button" disabled={uploadingBg} onClick={() => bgInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors">
              {uploadingBg ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              <span>{backgroundImageAssetId ? "Change Background" : "Upload Background Image"}</span>
            </button>
            {backgroundImageAssetId && <button type="button" onClick={() => { setBackgroundImageAssetId(null); setBgPreviewUrl(null); setBgNaturalSize(null); setSamplePdfUrl(null); }} className="text-xs text-danger-600 hover:underline font-semibold">Remove</button>}
          </div>
          {bgPreviewUrl && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-scholar-700">Live Preview — drag labels to position (A4 landscape 841.89×595.28)</span>
                {bgNaturalSize &&
                  (() => {
                    const ratio = bgNaturalSize.w / bgNaturalSize.h;
                    const target = PDF_W / PDF_H;
                    const diff = Math.abs(ratio - target) / target;
                    if (diff > 0.06) {
                      return (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          This image will be cropped/stretched to fit — recommended ~1684×1191px (1.414:1)
                        </span>
                      );
                    }
                    return null;
                  })()}
              </div>
              <div
                ref={previewRef}
                className="relative overflow-hidden rounded-xl border-2 border-scholar-300 bg-white shadow-sm select-none"
                style={{ width: PREVIEW_W, height: PREVIEW_H, maxWidth: "100%" }}
              >
                <img
                  src={bgPreviewUrl}
                  alt="Certificate background"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setBgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                  className="absolute inset-0 h-full w-full"
                  style={{ objectFit: "cover" }}
                  draggable={false}
                />
                {fieldPositions.map((fp, idx) => {
                  const xPx = fp.x * SCALE;
                  const yPx = fp.y * SCALE;
                  const fontPx = (fp.fontSize || 12) * SCALE;
                  const isDragging = draggingIdx === idx;
                  return (
                    <div
                      key={idx}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        setDraggingIdx(idx);
                      }}
                      onPointerMove={(e) => {
                        if (draggingIdx !== idx) return;
                        const rect = previewRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const newXpx = e.clientX - rect.left;
                        const newYpx = e.clientY - rect.top;
                        const clampedX = Math.max(0, Math.min(PREVIEW_W - 10, newXpx));
                        const clampedY = Math.max(0, Math.min(PREVIEW_H - 10, newYpx));
                        const newX = Math.round(clampedX / SCALE);
                        const newY = Math.round(clampedY / SCALE);
                        updateField(idx, { x: newX, y: newY });
                      }}
                      onPointerUp={(e) => {
                        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                        setDraggingIdx(null);
                      }}
                      className={`absolute cursor-move rounded px-1 py-0.5 text-xs font-bold leading-none shadow-sm ring-1 ${isDragging ? "bg-amber-300 ring-amber-500 z-10" : "bg-white/85 ring-scholar-300 backdrop-blur-sm"}`}
                      style={{
                        left: xPx,
                        top: yPx,
                        fontSize: fontPx,
                        color: fp.color || "#0F172A",
                        textAlign: (fp.align as any) || "left",
                        maxWidth: 300 * SCALE,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        userSelect: "none",
                        touchAction: "none",
                      }}
                      title={`${fp.key} (${fp.x}, ${fp.y}) — drag to reposition`}
                    >
                      {getSampleText(fp.key, fp.customText)}
                    </div>
                  );
                })}
                {fieldPositions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                    <span className="text-xs font-semibold text-scholar-600 bg-white px-3 py-1.5 rounded-full shadow">No fields — click “Add Field” below</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-scholar-500">Preview at {PREVIEW_W}×{PREVIEW_H}px (~A4 landscape 1.414:1, recommended 1684×1191px). Coordinates in PDF points (0–842, 0–595). Drag labels or use numeric inputs below — two-way synced.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSample}
                  disabled={generatingPreview}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-scholar-800 disabled:opacity-50"
                >
                  {generatingPreview ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                  <span>{generatingPreview ? "Generating..." : "Generate Sample Preview (PDF)"}</span>
                </button>
                {samplePdfUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(samplePdfUrl, "_blank")}
                    className="inline-flex items-center gap-1 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
                  >
                    Open in new tab
                  </button>
                )}
              </div>
              {samplePdfUrl && (
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <iframe src={samplePdfUrl} title="Sample certificate PDF" className="h-[360px] w-full" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Field Positions Editor — numeric fallback / fine-tuning */}
        {backgroundImageAssetId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Field Positions (numeric fine-tuning)</span>
              <button type="button" onClick={addField} className="text-xs font-bold text-scholar-700 bg-white border px-2 py-1 rounded-lg hover:bg-scholar-50">+ Add Field</button>
            </div>
            <p className="text-[11px] text-amber-800">Drag in preview above or edit X/Y directly (0–842 X, 0–595 Y). Changes sync both ways.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fieldPositions.map((fp, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-end bg-white p-2 rounded-lg border">
                  <div className="col-span-3">
                    <label className="text-[10px] font-semibold text-scholar-600">Field</label>
                    <select value={fp.key} onChange={(e) => updateField(idx, { key: e.target.value })} className="w-full rounded border px-1.5 py-1 text-xs">
                      <option value="studentName">Student Name</option>
                      <option value="courseName">Course Name</option>
                      <option value="completionDate">Completion Date</option>
                      <option value="certificateId">Certificate ID</option>
                      <option value="instituteName">Institute Name</option>
                      <option value="admissionDate">Admission Date</option>
                      <option value="certificateTitle">Certificate Title</option>
                      <option value="signatoryName">Signatory Name</option>
                      <option value="signatoryTitle">Signatory Title</option>
                      <option value="customText">Custom Text</option>
                    </select>
                  </div>
                  <div className="col-span-2"><label className="text-[10px] font-semibold text-scholar-600">X</label><input type="number" value={fp.x} onChange={(e) => updateField(idx, { x: Number(e.target.value) })} className="w-full rounded border px-1.5 py-1 text-xs" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-semibold text-scholar-600">Y</label><input type="number" value={fp.y} onChange={(e) => updateField(idx, { y: Number(e.target.value) })} className="w-full rounded border px-1.5 py-1 text-xs" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-semibold text-scholar-600">Size</label><input type="number" value={fp.fontSize || 12} onChange={(e) => updateField(idx, { fontSize: Number(e.target.value) })} className="w-full rounded border px-1.5 py-1 text-xs" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-semibold text-scholar-600">Align</label><select value={fp.align || "left"} onChange={(e) => updateField(idx, { align: e.target.value as any })} className="w-full rounded border px-1.5 py-1 text-xs"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
                  <div className="col-span-1 flex justify-end"><button type="button" onClick={() => removeField(idx)} className="text-rose-600 hover:text-rose-800 text-xs font-bold">✕</button></div>
                  {fp.key === "customText" && <div className="col-span-12"><input placeholder="Custom text (supports {studentName} etc.)" value={fp.customText || ""} onChange={(e) => updateField(idx, { customText: e.target.value })} className="w-full rounded border px-1.5 py-1 text-xs" /></div>}
                </div>
              ))}
              {fieldPositions.length === 0 && <p className="text-xs text-scholar-400 text-center py-2">No fields yet — click Add Field.</p>}
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-bold text-white hover:bg-scholar-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
            <span>{loading ? "Saving..." : "Save Template"}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
