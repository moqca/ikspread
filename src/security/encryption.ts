import * as crypto from "crypto";
import { EncryptionConfig } from "./types";

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(
  plaintext: string,
  masterKey: string,
  config: EncryptionConfig = {
    algorithm: "aes-256-gcm",
    kdf: "pbkdf2",
    iterations: 100000,
    saltLength: 32,
  }
): string {
  // Generate random salt and IV
  const salt = crypto.randomBytes(config.saltLength ?? 32);
  const iv = crypto.randomBytes(16);

  // Derive encryption key from master key
  const key = deriveKey(masterKey, salt, config);

  // Create cipher
  const cipher = crypto.createCipheriv(config.algorithm, key, iv);

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // Get auth tag (for GCM mode)
  const authTag = config.algorithm.includes("gcm")
    ? (cipher as any).getAuthTag()
    : Buffer.alloc(0);

  // Combine salt + iv + authTag + encrypted data
  const result = Buffer.concat([
    salt,
    iv,
    authTag,
    encrypted,
  ]);

  // Return as base64
  return result.toString("base64");
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(
  ciphertext: string,
  masterKey: string,
  config: EncryptionConfig = {
    algorithm: "aes-256-gcm",
    kdf: "pbkdf2",
    iterations: 100000,
    saltLength: 32,
  }
): string {
  // Decode from base64
  const data = Buffer.from(ciphertext, "base64");

  const saltLength = config.saltLength ?? 32;
  const ivLength = 16;
  const authTagLength = config.algorithm.includes("gcm") ? 16 : 0;

  // Extract components
  let offset = 0;
  const salt = data.subarray(offset, offset + saltLength);
  offset += saltLength;

  const iv = data.subarray(offset, offset + ivLength);
  offset += ivLength;

  const authTag = authTagLength > 0
    ? data.subarray(offset, offset + authTagLength)
    : Buffer.alloc(0);
  offset += authTagLength;

  const encrypted = data.subarray(offset);

  // Derive decryption key
  const key = deriveKey(masterKey, salt, config);

  // Create decipher
  const decipher = crypto.createDecipheriv(config.algorithm, key, iv);

  // Set auth tag (for GCM mode)
  if (authTagLength > 0) {
    (decipher as any).setAuthTag(authTag);
  }

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Derive encryption key from master key using KDF
 */
function deriveKey(
  masterKey: string,
  salt: Buffer,
  config: EncryptionConfig
): Buffer {
  const iterations = config.iterations ?? 100000;

  if (config.kdf === "pbkdf2") {
    return crypto.pbkdf2Sync(masterKey, salt, iterations, 32, "sha256");
  } else if (config.kdf === "scrypt") {
    return crypto.scryptSync(masterKey, salt, 32);
  } else {
    throw new Error(`Unsupported KDF: ${config.kdf}`);
  }
}

/**
 * Generate a random master key
 */
export function generateMasterKey(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a value (for storage/comparison)
 */
export function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Securely compare two strings (constant-time)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Mask a secret for logging (show first/last 4 chars)
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "***";
  }

  const first = secret.substring(0, 4);
  const last = secret.substring(secret.length - 4);
  const masked = "*".repeat(Math.min(secret.length - 8, 20));

  return `${first}${masked}${last}`;
}
