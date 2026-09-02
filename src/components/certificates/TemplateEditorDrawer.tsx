"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2, Upload, Check } from "lucide-react";
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

  const [name, setName] = useState(template?.name || "");
  const [title, setTitle] = useState(template?.title || "Certificate of Completion");
  const [bodyText, setBodyText] = useState(template?.bodyText || DEFAULT_BODY);
  const [signatoryName, setSignatoryName] = useState(template?.signatoryName || "Authorized Signatory");
  const [signatoryTitle, setSignatoryTitle] = useState(template?.signatoryTitle || "Director / Academic Head");
  const [signatureFileAssetId, setSignatureFileAssetId] = useState<string | null>(
    template?.signatureFileAssetId || null
  );

  const [uploadingSig, setUploadingSig] = useState(false);
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
    } else {
      setName("");
      setTitle("Certificate of Completion");
      setBodyText(DEFAULT_BODY);
      setSignatoryName("Authorized Signatory");
      setSignatoryTitle("Director / Academic Head");
      setSignatureFileAssetId(null);
    }
  }, [template, open]);

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

      const res = await fetch("/api/files/upload", {
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
