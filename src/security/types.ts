/**
 * Types for security and secrets management
 */

export interface SecretConfig {
  /** Secret identifier */
  key: string;

  /** Environment variable name */
  envVar: string;

  /** Is this secret required? */
  required: boolean;

  /** Description of the secret */
  description?: string;

  /** Validation pattern (regex) */
  validationPattern?: string;

  /** Minimum length */
  minLength?: number;

  /** Maximum age in days before rotation recommended */
  maxAgeDays?: number;
}

export interface EncryptionConfig {
  /** Encryption algorithm */
  algorithm: "aes-256-gcm" | "aes-256-cbc";

  /** Key derivation function */
  kdf: "pbkdf2" | "scrypt";

  /** Number of iterations for key derivation */
  iterations?: number;

  /** Salt length in bytes */
  saltLength?: number;
}

export interface SecretMetadata {
  /** When the secret was set */
  setAt: Date;

  /** When the secret was last accessed */
  lastAccessedAt?: Date;

  /** Number of times accessed */
  accessCount: number;

  /** When rotation is recommended */
  rotationRecommendedAt?: Date;

  /** Is the secret encrypted? */
  encrypted: boolean;
}

export interface SecretStore {
  /** Get a secret by key */
  get(key: string): string | undefined;

  /** Set a secret */
  set(key: string, value: string, metadata?: Partial<SecretMetadata>): void;

  /** Check if a secret exists */
  has(key: string): boolean;

  /** Delete a secret */
  delete(key: string): void;

  /** List all secret keys (not values) */
  keys(): string[];

  /** Get metadata for a secret */
  getMetadata(key: string): SecretMetadata | undefined;

  /** Clear all secrets */
  clear(): void;
}

export interface AuditLog {
  /** Timestamp */
  timestamp: Date;

  /** Action performed */
  action: "access" | "set" | "delete" | "rotation" | "validation-failed";

  /** Secret key (not value) */
  secretKey: string;

  /** Success status */
  success: boolean;

  /** Additional context */
  context?: Record<string, any>;

  /** Error message if failed */
  error?: string;
}

export interface SecretValidationResult {
  /** Is the secret valid? */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Warnings (non-blocking) */
  warnings: string[];
}
