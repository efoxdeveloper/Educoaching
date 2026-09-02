import crypto from "crypto";

/**
 * =====================================================================
 * Tenant Credential & API Key Encryption Utility
 * =====================================================================
 * Uses AES-256-GCM authenticated encryption for storing sensitive
 * per-institute third-party credentials at rest (e.g. BYOK SMS API keys).
 *
 * Requirements:
 * - Set CREDENTIAL_ENCRYPTION_KEY in your environment (.env).
 * - Key format: 32 bytes (64 hex characters or 32 UTF-8 characters).
 * - Generate a secure random 32-byte key via CLI:
 *     openssl rand -hex 32
 *
 * Ciphertext serialization format:
 *   `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 * =====================================================================
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

function getEncryptionKey(): Buffer {
  const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!rawKey || !rawKey.trim()) {
    throw new Error(
      "[Crypto] Missing required environment variable: CREDENTIAL_ENCRYPTION_KEY. " +
        "Generate one using `openssl rand -hex 32` and add it to your .env file."
    );
  }

  const trimmed = rawKey.trim();

  // If 64 hex characters (32 bytes), parse as hex
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  // If 32-character ASCII/UTF-8 string (32 bytes)
  if (Buffer.byteLength(trimmed, "utf8") === 32) {
    return Buffer.from(trimmed, "utf8");
  }

  // Derive 32-byte key via SHA-256 if key is provided with non-standard length
  return crypto.createHash("sha256").update(trimmed).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random IV.
 * Returns a self-contained string formatted as `iv:authTag:ciphertext`.
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== "string") {
    throw new Error("[Crypto] Input to encrypt must be a string.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");

  return `${ivHex}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a self-contained `iv:authTag:ciphertext` string using AES-256-GCM.
 */
export function decrypt(cipherString: string): string {
  if (!cipherString || typeof cipherString !== "string") {
    throw new Error("[Crypto] Invalid ciphertext input.");
  }

  const parts = cipherString.split(":");
  if (parts.length !== 3) {
    throw new Error("[Crypto] Invalid cipher format. Expected iv:authTag:ciphertext");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
