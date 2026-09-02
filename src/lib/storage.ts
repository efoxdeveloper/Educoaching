import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// File/storage foundation (Phase 0). A thin, swappable abstraction over
// "put some bytes somewhere and get them back by key" - upload/download
// routes and the FileAsset table only ever talk to this interface, so
// swapping the backend later (S3, Cloudinary, R2, ...) means adding one
// new class and changing the single line in getStorageProvider() below.
// Nothing else in the app needs to change.
//
// IMPORTANT PRODUCTION NOTE: LocalDiskStorage writes to the server's local
// filesystem. That's fine for local development, but most production
// hosts (e.g. Vercel) run on ephemeral, read-only-outside-/tmp filesystems
// - files written here will NOT reliably persist across requests or
// deployments in that environment. Before real student/admission
// documents go live in production, implement an S3Storage (or
// Cloudinary/R2) class below and switch getStorageProvider() to use it.

export interface StorageProvider {
  save(key: string, buffer: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

class LocalDiskStorage implements StorageProvider {
  private resolvePath(key: string): string {
    const resolved = path.join(UPLOAD_ROOT, key);
    // Guard against path traversal (e.g. a key containing "../../") -
    // the resolved path must stay inside UPLOAD_ROOT.
    if (!resolved.startsWith(UPLOAD_ROOT + path.sep) && resolved !== UPLOAD_ROOT) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch (err) {
      // Already gone is fine - a stale FileAsset row shouldn't block a
      // delete just because the underlying file disappeared some other way.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) provider = new LocalDiskStorage();
  return provider;
}

// Builds a tenant-namespaced, collision-resistant storage key, e.g.
// "cl9abc123/student-document/1699999999999-a1b2c3d4e5f6.pdf". Namespacing
// by instituteId first keeps one tenant's files physically separated from
// another's on disk, mirroring the tenant isolation used everywhere else.
export function buildStorageKey(instituteId: string, category: string, originalName: string): string {
  const ext = path.extname(originalName).slice(0, 20); // guard against absurd/hostile extensions
  const random = crypto.randomBytes(8).toString("hex");
  const safeCategory = category.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `${instituteId}/${safeCategory}/${Date.now()}-${random}${ext}`;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
