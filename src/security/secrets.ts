import {
  SecretConfig,
  SecretStore,
  SecretMetadata,
  SecretValidationResult,
  AuditLog,
} from "./types";
import { encrypt, decrypt, maskSecret } from "./encryption";

/**
 * In-memory secret store with optional encryption
 */
export class MemorySecretStore implements SecretStore {
  private secrets: Map<string, string> = new Map();
  private metadata: Map<string, SecretMetadata> = new Map();
  private masterKey?: string;
  private auditLogs: AuditLog[] = [];

  constructor(masterKey?: string) {
    this.masterKey = masterKey;
  }

  get(key: string): string | undefined {
    const encrypted = this.secrets.get(key);
    if (!encrypted) {
      this.audit("access", key, false, { error: "Secret not found" });
      return undefined;
    }

    try {
      // Decrypt if master key is set
      const value = this.masterKey ? decrypt(encrypted, this.masterKey) : encrypted;

      // Update metadata
      const meta = this.metadata.get(key);
      if (meta) {
        meta.lastAccessedAt = new Date();
        meta.accessCount++;
      }

      this.audit("access", key, true);
      return value;
    } catch (error) {
      this.audit("access", key, false, { error: String(error) });
      throw new Error(`Failed to decrypt secret: ${key}`);
    }
  }

  set(key: string, value: string, metadata?: Partial<SecretMetadata>): void {
    try {
      // Encrypt if master key is set
      const stored = this.masterKey ? encrypt(value, this.masterKey) : value;
      this.secrets.set(key, stored);

      // Set metadata
      const meta: SecretMetadata = {
        setAt: new Date(),
        accessCount: 0,
        encrypted: !!this.masterKey,
        ...metadata,
      };
      this.metadata.set(key, meta);

      this.audit("set", key, true, { encrypted: !!this.masterKey });
    } catch (error) {
      this.audit("set", key, false, { error: String(error) });
      throw error;
    }
  }

  has(key: string): boolean {
    return this.secrets.has(key);
  }

  delete(key: string): void {
    const existed = this.secrets.delete(key);
    this.metadata.delete(key);
    this.audit("delete", key, existed);
  }

  keys(): string[] {
    return Array.from(this.secrets.keys());
  }

  getMetadata(key: string): SecretMetadata | undefined {
    return this.metadata.get(key);
  }

  clear(): void {
    const count = this.secrets.size;
    this.secrets.clear();
    this.metadata.clear();
    this.audit("delete", "ALL", true, { count });
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit?: number): AuditLog[] {
    const logs = [...this.auditLogs];
    return limit ? logs.slice(-limit) : logs;
  }

  /**
   * Clear audit logs
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
  }

  private audit(
    action: AuditLog["action"],
    secretKey: string,
    success: boolean,
    context?: Record<string, any>
  ): void {
    this.auditLogs.push({
      timestamp: new Date(),
      action,
      secretKey,
      success,
      context,
    });

    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }
}

/**
 * Validate a secret against configuration
 */
export function validateSecret(
  value: string,
  config: SecretConfig
): SecretValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required
  if (config.required && (!value || value.trim().length === 0)) {
    errors.push(`Secret '${config.key}' is required but not provided`);
    return { valid: false, errors, warnings };
  }

  // Check minimum length
  if (config.minLength && value.length < config.minLength) {
    errors.push(
      `Secret '${config.key}' must be at least ${config.minLength} characters (got ${value.length})`
    );
  }

  // Check validation pattern
  if (config.validationPattern) {
    const pattern = new RegExp(config.validationPattern);
    if (!pattern.test(value)) {
      errors.push(
        `Secret '${config.key}' does not match required pattern: ${config.validationPattern}`
      );
    }
  }

  // Check for common weak patterns
  if (value.toLowerCase().includes("password") || value.toLowerCase().includes("secret")) {
    warnings.push(`Secret '${config.key}' contains common weak terms`);
  }

  if (/^[0-9]+$/.test(value)) {
    warnings.push(`Secret '${config.key}' is numeric-only (weak)`);
  }

  if (value.length < 16) {
    warnings.push(`Secret '${config.key}' is shorter than recommended (16+ chars)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Load secrets from environment variables
 */
export function loadSecretsFromEnv(
  configs: SecretConfig[],
  store: SecretStore
): { loaded: number; errors: string[] } {
  let loaded = 0;
  const errors: string[] = [];

  for (const config of configs) {
    const value = process.env[config.envVar];

    if (!value) {
      if (config.required) {
        errors.push(`Required environment variable not set: ${config.envVar}`);
      }
      continue;
    }

    // Validate secret
    const validation = validateSecret(value, config);
    if (!validation.valid) {
      errors.push(...validation.errors);
      continue;
    }

    // Store secret
    const metadata: Partial<SecretMetadata> = {
      setAt: new Date(),
    };

    if (config.maxAgeDays) {
      const rotationDate = new Date();
      rotationDate.setDate(rotationDate.getDate() + config.maxAgeDays);
      metadata.rotationRecommendedAt = rotationDate;
    }

    store.set(config.key, value, metadata);
    loaded++;

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn(`Warnings for ${config.key}:`, validation.warnings);
    }
  }

  return { loaded, errors };
}

/**
 * Check which secrets need rotation
 */
export function checkRotationNeeded(store: SecretStore): string[] {
  const needsRotation: string[] = [];

  for (const key of store.keys()) {
    const metadata = store.getMetadata(key);
    if (!metadata?.rotationRecommendedAt) continue;

    if (new Date() >= metadata.rotationRecommendedAt) {
      needsRotation.push(key);
    }
  }

  return needsRotation;
}

/**
 * Get required secret or throw error
 */
export function requireSecret(store: SecretStore, key: string): string {
  const value = store.get(key);
  if (!value) {
    throw new Error(`Required secret not found: ${key}`);
  }
  return value;
}

/**
 * Get secret with default value
 */
export function getSecretOrDefault(
  store: SecretStore,
  key: string,
  defaultValue: string
): string {
  return store.get(key) ?? defaultValue;
}

/**
 * Log secret access safely (with masking)
 */
export function logSecretAccess(key: string, value: string): void {
  console.log(`Accessed secret: ${key} = ${maskSecret(value)}`);
}
