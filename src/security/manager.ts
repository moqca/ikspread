import { SecretConfig, SecretStore } from "./types";
import { MemorySecretStore, loadSecretsFromEnv, checkRotationNeeded } from "./secrets";
import { generateMasterKey } from "./encryption";

/**
 * Security manager - centralized security and secrets management
 */
export class SecurityManager {
  private store: SecretStore;
  private configs: Map<string, SecretConfig> = new Map();

  constructor(masterKey?: string) {
    this.store = new MemorySecretStore(masterKey);
  }

  /**
   * Register secret configurations
   */
  registerSecrets(configs: SecretConfig[]): void {
    for (const config of configs) {
      this.configs.set(config.key, config);
    }
  }

  /**
   * Load secrets from environment variables
   */
  loadFromEnv(): { success: boolean; loaded: number; errors: string[] } {
    const configs = Array.from(this.configs.values());
    const { loaded, errors } = loadSecretsFromEnv(configs, this.store);

    return {
      success: errors.length === 0,
      loaded,
      errors,
    };
  }

  /**
   * Get a secret
   */
  getSecret(key: string): string | undefined {
    return this.store.get(key);
  }

  /**
   * Get a required secret (throws if not found)
   */
  requireSecret(key: string): string {
    const value = this.store.get(key);
    if (!value) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }

  /**
   * Set a secret manually
   */
  setSecret(key: string, value: string): void {
    this.store.set(key, value);
  }

  /**
   * Check if a secret exists
   */
  hasSecret(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * Delete a secret
   */
  deleteSecret(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get all secret keys (not values)
   */
  getSecretKeys(): string[] {
    return this.store.keys();
  }

  /**
   * Check which secrets need rotation
   */
  checkRotation(): string[] {
    return checkRotationNeeded(this.store);
  }

  /**
   * Get audit logs from store
   */
  getAuditLogs(limit?: number) {
    if (this.store instanceof MemorySecretStore) {
      return this.store.getAuditLogs(limit);
    }
    return [];
  }

  /**
   * Clear all secrets (use with caution)
   */
  clearAll(): void {
    this.store.clear();
  }

  /**
   * Get store instance
   */
  getStore(): SecretStore {
    return this.store;
  }
}

/**
 * Create a default security manager with common trading bot secrets
 */
export function createDefaultSecurityManager(masterKey?: string): SecurityManager {
  const manager = new SecurityManager(masterKey);

  // Define common secrets for trading bot
  const secrets: SecretConfig[] = [
    // TradeOtter credentials
    {
      key: "tradeotter.username",
      envVar: "TRADEOTTER_USERNAME",
      required: false,
      description: "TradeOtter account username",
      minLength: 3,
    },
    {
      key: "tradeotter.password",
      envVar: "TRADEOTTER_PASSWORD",
      required: false,
      description: "TradeOtter account password",
      minLength: 8,
      maxAgeDays: 90,
    },

    // IBKR credentials
    {
      key: "ibkr.username",
      envVar: "IBKR_USERNAME",
      required: false,
      description: "Interactive Brokers username",
      minLength: 3,
    },
    {
      key: "ibkr.password",
      envVar: "IBKR_PASSWORD",
      required: false,
      description: "Interactive Brokers password",
      minLength: 8,
      maxAgeDays: 90,
    },
    {
      key: "ibkr.account",
      envVar: "IBKR_ACCOUNT",
      required: false,
      description: "Interactive Brokers account ID",
      validationPattern: "^[A-Z]{1}[0-9]{7,9}$",
    },

    // API keys
    {
      key: "api.key",
      envVar: "API_KEY",
      required: false,
      description: "API key for external services",
      minLength: 16,
    },
    {
      key: "api.secret",
      envVar: "API_SECRET",
      required: false,
      description: "API secret for external services",
      minLength: 32,
      maxAgeDays: 180,
    },

    // Encryption master key
    {
      key: "encryption.master_key",
      envVar: "MASTER_ENCRYPTION_KEY",
      required: false,
      description: "Master encryption key for securing data at rest",
      minLength: 32,
    },

    // Database credentials (if needed)
    {
      key: "db.password",
      envVar: "DB_PASSWORD",
      required: false,
      description: "Database password",
      minLength: 12,
      maxAgeDays: 90,
    },

    // Webhook secrets
    {
      key: "webhook.secret",
      envVar: "WEBHOOK_SECRET",
      required: false,
      description: "Secret for webhook signature verification",
      minLength: 32,
    },

    // Alert notification services
    {
      key: "telegram.bot_token",
      envVar: "TELEGRAM_BOT_TOKEN",
      required: false,
      description: "Telegram bot token for alerts",
      validationPattern: "^[0-9]{8,10}:[A-Za-z0-9_-]{35}$",
    },
    {
      key: "slack.webhook_url",
      envVar: "SLACK_WEBHOOK_URL",
      required: false,
      description: "Slack webhook URL for alerts",
      validationPattern: "^https://hooks\\.slack\\.com/services/.*$",
    },
  ];

  manager.registerSecrets(secrets);

  return manager;
}

/**
 * Initialize security manager from environment
 */
export function initSecurityManager(): SecurityManager {
  // Get master key from environment or generate one
  let masterKey = process.env.MASTER_ENCRYPTION_KEY;

  if (!masterKey) {
    console.warn(
      "MASTER_ENCRYPTION_KEY not set. Generating temporary key (secrets will not persist across restarts)"
    );
    masterKey = generateMasterKey();
  }

  const manager = createDefaultSecurityManager(masterKey);
  const result = manager.loadFromEnv();

  if (!result.success) {
    console.error("Failed to load some secrets:");
    result.errors.forEach((err) => console.error(`  - ${err}`));
  } else {
    console.log(`Successfully loaded ${result.loaded} secrets`);
  }

  // Check rotation
  const needsRotation = manager.checkRotation();
  if (needsRotation.length > 0) {
    console.warn("The following secrets need rotation:", needsRotation.join(", "));
  }

  return manager;
}
