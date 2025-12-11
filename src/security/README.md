# Security & Secrets Management

Comprehensive security module for managing sensitive credentials and encryption in the ikspread trading bot.

## Features

- **AES-256-GCM Encryption**: Military-grade encryption for secrets at rest
- **Key Derivation**: PBKDF2 with 100,000 iterations for master key derivation
- **Secret Validation**: Pattern matching and strength validation for credentials
- **Rotation Tracking**: Monitor and manage secret rotation lifecycle
- **Audit Logging**: Complete audit trail for compliance and debugging
- **Safe Masking**: Secure logging with automatic secret masking

## Quick Start

```typescript
import { initSecurityManager } from './security';

// Initialize from environment variables
const manager = initSecurityManager();

// Get a secret
const apiKey = manager.getSecret('api.key');

// Get a required secret (throws if missing)
const password = manager.requireSecret('ibkr.password');

// Set a secret manually
manager.setSecret('custom.key', 'sensitive-value');
```

## Environment Variables

Set these in your `.env` file:

```bash
# Master encryption key (required for encrypted storage)
MASTER_ENCRYPTION_KEY=your_64_char_hex_key_here

# Trading platform credentials
TRADEOTTER_USERNAME=your_username
TRADEOTTER_PASSWORD=your_password
IBKR_USERNAME=your_ibkr_user
IBKR_PASSWORD=your_ibkr_pass
IBKR_ACCOUNT=U12345678

# API credentials
API_KEY=your_api_key
API_SECRET=your_api_secret

# Alert services
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Generating a Master Key

Use OpenSSL to generate a secure master key:

```bash
openssl rand -hex 32
```

Or use the built-in generator:

```typescript
import { generateMasterKey } from './security';

const masterKey = generateMasterKey();
console.log(masterKey);
```

## Secret Validation

The module validates secrets against configured rules:

```typescript
import { validateSecret } from './security';

const config = {
  key: 'ibkr.account',
  envVar: 'IBKR_ACCOUNT',
  required: true,
  validationPattern: '^[A-Z]{1}[0-9]{7,9}$',
  minLength: 8,
};

const result = validateSecret('U12345678', config);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Encryption/Decryption

Manually encrypt/decrypt sensitive data:

```typescript
import { encrypt, decrypt, generateMasterKey } from './security';

const masterKey = generateMasterKey();
const sensitive = 'my-secret-data';

// Encrypt
const encrypted = encrypt(sensitive, masterKey);

// Decrypt
const decrypted = decrypt(encrypted, masterKey);
```

## Rotation Management

Track and manage secret rotation:

```typescript
const manager = initSecurityManager();

// Check which secrets need rotation
const needsRotation = manager.checkRotation();
if (needsRotation.length > 0) {
  console.warn('Rotate these secrets:', needsRotation);
}
```

## Audit Logging

Review security events:

```typescript
const manager = initSecurityManager();

// Get recent audit logs
const logs = manager.getAuditLogs(50);
logs.forEach(log => {
  console.log(`[${log.action}] ${log.secretKey} - ${log.success ? '✓' : '✗'}`);
});
```

## Safe Logging

Mask secrets in logs:

```typescript
import { maskSecret } from './security';

const apiKey = 'sk_test_EXAMPLE_KEY_REPLACE_ME';
console.log(`API Key: ${maskSecret(apiKey)}`);
// Output: API Key: sk_l********************mnop
```

## Security Best Practices

1. **Never commit secrets**: Keep `.env` out of version control
2. **Rotate regularly**: Set `maxAgeDays` for automatic rotation reminders
3. **Use strong keys**: Generate master keys with at least 32 bytes of entropy
4. **Monitor audit logs**: Review access patterns for anomalies
5. **Validate inputs**: Always validate secrets before storing
6. **Mask in logs**: Use `maskSecret()` when logging sensitive data

## Architecture

- **SecretStore**: Interface for secret storage (in-memory, file, etc.)
- **MemorySecretStore**: Default in-memory implementation with encryption
- **SecurityManager**: High-level API for application use
- **Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Validation**: Pattern matching and strength checks

## Running the Demo

```bash
npm run demo:security
```

This demonstrates all security features including encryption, validation, rotation, and audit logging.
