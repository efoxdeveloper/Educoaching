"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { hasPermission } from "@/lib/permissions";

// Generic "documents for one entity" panel. Talks to the existing
// tenant-scoped /api/files endpoints — nothing here is student/faculty
// specific beyond the props, so the same drawer works for any FileAsset
// category + relatedType/relatedId pair.

type FileAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsDrawer({
  open,
  onClose,
  relatedType,
  relatedId,
  category,
  entityLabel,
}: {
  open: boolean;
  onClose: () => void;
  relatedType: "Student" | "Faculty";
  relatedId: string;
  category: "STUDENT_DOCUMENT" | "FACULTY_DOCUMENT";
  entityLabel: string;
}) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManage = hasPermission(role, "files:write");

  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/files?relatedType=${relatedType}&relatedId=${relatedId}`);
      if (!res.ok) throw new Error();
      setFiles(await res.json());
    } catch {
      setError("Couldn't load documents.");
    } finally {
      setLoading(false);
    }
  }, [relatedType, relatedId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    e.target.value = "";
    if (!picked || picked.length === 0) return;

    setError("");
    setBusy(true);
    try {
      for (const file of Array.from(picked)) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          setError(`"${file.name}" isn't a supported file type — use PDF, JPG, PNG, or WEBP.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setError(`"${file.name}" is over the 10MB limit.`);
          continue;
        }
        const body = new FormData();
        body.append("file", file);
        body.append("category", category);
        body.append("relatedType", relatedType);
        body.append("relatedId", relatedId);

        const res = await fetch("/api/files", { method: "POST", body });
        if (!res.ok) setError(`Failed to upload "${file.name}".`);
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError("Failed to delete document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Documents — ${entityLabel}`}>
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-600">{error}</p>
        )}

        {canManage && (
          <div>
            <input
              id={`doc-upload-${relatedId}`}
              type="file"
              multiple
              accept={ALLOWED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={handleUpload}
              disabled={busy}
            />
            <label
              htmlFor={`doc-upload-${relatedId}`}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-scholar-50 ${
                busy ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Upload document
            </label>
            <p className="mt-1.5 text-xs text-scholar-400">PDF, JPG, PNG, or WEBP. Up to 10MB each.</p>
          </div>
        )}

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-scholar-400">
            <Loader2 size={15} className="animate-spin" /> Loading documents...
          </p>
        ) : files.length === 0 ? (
          <p className="rounded-xl bg-paper px-3 py-6 text-center text-sm text-scholar-400">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-xl border border-scholar-100 px-3 py-2.5"
              >
                <a
                  href={`/api/files/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink hover:text-scholar-600"
                >
                  <FileText size={16} className="shrink-0 text-scholar-300" />
                  <span className="truncate">{f.fileName}</span>
                </a>
                <span className="shrink-0 text-xs text-scholar-400">{formatSize(f.sizeBytes)}</span>
                {canManage && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={busy}
                    aria-label="Delete document"
                    className="shrink-0 text-scholar-300 hover:text-danger-600 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
