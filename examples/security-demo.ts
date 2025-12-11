/**
 * Demo script showing security and secrets management features
 * Run with: ts-node examples/security-demo.ts
 */

import {
  createDefaultSecurityManager,
  MemorySecretStore,
  encrypt,
  decrypt,
  generateMasterKey,
  maskSecret,
  validateSecret,
  checkRotationNeeded,
} from "../src/security";
import type { SecretConfig } from "../src/security/types";

function runDemo() {
  console.log("=== Security & Secrets Management Demo ===\n");

  // Demo 1: Encryption/Decryption
  console.log("--- Demo 1: Encryption/Decryption ---");
  const masterKey = generateMasterKey();
  console.log(`Generated Master Key: ${maskSecret(masterKey)}`);

  const sensitiveData = "MySecretAPIKey12345";
  console.log(`Original Data: ${maskSecret(sensitiveData)}`);

  const encrypted = encrypt(sensitiveData, masterKey);
  console.log(`Encrypted: ${encrypted.substring(0, 40)}...`);

  const decrypted = decrypt(encrypted, masterKey);
  console.log(`Decrypted: ${maskSecret(decrypted)}`);
  console.log(`Match: ${decrypted === sensitiveData ? "✓ YES" : "✗ NO"}\n`);

  // Demo 2: Secret Store
  console.log("--- Demo 2: Secret Store with Encryption ---");
  const store = new MemorySecretStore(masterKey);

  // Store some secrets
  store.set("api.key", "sk_test_1234567890abcdef");
  store.set("api.secret", "secret_key_very_long_and_secure_123456789");
  store.set("db.password", "SuperSecureDBPassword!");

  console.log(`Stored ${store.keys().length} secrets`);
  console.log(`Secret keys: ${store.keys().join(", ")}`);

  // Retrieve a secret
  const apiKey = store.get("api.key");
  console.log(`Retrieved API Key: ${maskSecret(apiKey!)}`);

  // Check metadata
  const metadata = store.getMetadata("api.key");
  console.log(`Metadata - Set at: ${metadata?.setAt.toISOString()}`);
  console.log(`Metadata - Encrypted: ${metadata?.encrypted}`);
  console.log(`Metadata - Access count: ${metadata?.accessCount}\n`);

  // Demo 3: Secret Validation
  console.log("--- Demo 3: Secret Validation ---");
  const secretConfig: SecretConfig = {
    key: "ibkr.account",
    envVar: "IBKR_ACCOUNT",
    required: true,
    description: "IBKR account ID",
    validationPattern: "^[A-Z]{1}[0-9]{7,9}$",
    minLength: 8,
  };

  // Valid account
  const validAccount = "U12345678";
  const validResult = validateSecret(validAccount, secretConfig);
  console.log(`Validating "${validAccount}":`);
  console.log(`  Valid: ${validResult.valid ? "✓ YES" : "✗ NO"}`);
  if (validResult.errors.length > 0) {
    console.log(`  Errors: ${validResult.errors.join(", ")}`);
  }
  if (validResult.warnings.length > 0) {
    console.log(`  Warnings: ${validResult.warnings.join(", ")}`);
  }

  // Invalid account
  const invalidAccount = "12345678"; // Missing letter prefix
  const invalidResult = validateSecret(invalidAccount, secretConfig);
  console.log(`\nValidating "${invalidAccount}":`);
  console.log(`  Valid: ${invalidResult.valid ? "✓ YES" : "✗ NO"}`);
  if (invalidResult.errors.length > 0) {
    console.log(`  Errors: ${invalidResult.errors.join(", ")}`);
  }
  console.log();

  // Demo 4: Security Manager
  console.log("--- Demo 4: Security Manager ---");
  const manager = createDefaultSecurityManager(masterKey);

  // Manually set some secrets
  manager.setSecret("tradeotter.username", "trader@example.com");
  manager.setSecret("tradeotter.password", "MySecurePassword123!");
  manager.setSecret("ibkr.account", "U87654321");

  console.log(`Security Manager initialized`);
  console.log(`Total secrets: ${manager.getSecretKeys().length}`);
  console.log(`Has TradeOtter username: ${manager.hasSecret("tradeotter.username") ? "✓ YES" : "✗ NO"}`);
  console.log(`Has IBKR password: ${manager.hasSecret("ibkr.password") ? "✓ YES" : "✗ NO"}`);

  // Retrieve required secret
  try {
    const username = manager.requireSecret("tradeotter.username");
    console.log(`TradeOtter username: ${maskSecret(username)}`);
  } catch (error) {
    console.error(`Error: ${error}`);
  }

  // Try to get missing required secret
  try {
    manager.requireSecret("missing.secret");
  } catch (error) {
    console.log(`Expected error for missing secret: ${(error as Error).message}`);
  }
  console.log();

  // Demo 5: Rotation Checks
  console.log("--- Demo 5: Secret Rotation ---");
  const rotatingStore = new MemorySecretStore();

  // Add secret with rotation metadata
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  rotatingStore.set("api.key.old", "old_key_123", {
    rotationRecommendedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  });

  rotatingStore.set("api.key.current", "current_key_456", {
    rotationRecommendedAt: futureDate, // 30 days from now
  });

  const needsRotation = checkRotationNeeded(rotatingStore);
  console.log(`Secrets needing rotation: ${needsRotation.length}`);
  if (needsRotation.length > 0) {
    console.log(`  - ${needsRotation.join(", ")}`);
  }
  console.log();

  // Demo 6: Audit Logs
  console.log("--- Demo 6: Audit Logs ---");
  const auditStore = new MemorySecretStore(masterKey);

  // Perform various operations
  auditStore.set("test.secret1", "value1");
  auditStore.set("test.secret2", "value2");
  auditStore.get("test.secret1");
  auditStore.get("test.secret1");
  auditStore.get("test.secret2");
  auditStore.delete("test.secret2");

  const logs = auditStore.getAuditLogs(10);
  console.log(`Total audit log entries: ${logs.length}`);
  console.log("Recent logs:");
  logs.forEach((log, idx) => {
    console.log(
      `  ${idx + 1}. [${log.action}] ${log.secretKey} - ${log.success ? "✓" : "✗"} (${log.timestamp.toISOString()})`
    );
  });
  console.log();

  // Demo 7: Secret Masking
  console.log("--- Demo 7: Secret Masking ---");
  const secrets = [
    "short",
    "medium-len",
    "this-is-a-very-long-secret-key-1234567890",
    "sk_test_1234567890abcdefghijklmnop",
  ];

  console.log("Masked secrets for safe logging:");
  secrets.forEach((secret) => {
    console.log(`  ${secret.padEnd(45)} → ${maskSecret(secret)}`);
  });
  console.log();

  console.log("=== Demo Complete ===");
  console.log("\nKey Takeaways:");
  console.log("1. All secrets stored in memory are encrypted with AES-256-GCM");
  console.log("2. Master key derivation uses PBKDF2 with 100,000 iterations");
  console.log("3. Secret validation prevents weak or malformed credentials");
  console.log("4. Rotation tracking helps maintain security hygiene");
  console.log("5. Comprehensive audit logging for compliance");
  console.log("6. Safe secret masking for logging and debugging");
}

// Run demo if executed directly
if (require.main === module) {
  try {
    runDemo();
  } catch (error) {
    console.error("Demo failed:", error);
    process.exitCode = 1;
  }
}
