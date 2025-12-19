# 🔒 FamilyConnect Security Best Practices Guide

## Executive Summary

FamilyConnect now implements comprehensive security controls to protect user data and API access:

- **✅ API Security**: JWT authentication, rate limiting, request validation
- **✅ Data Protection**: AES-256-GCM encryption for all PII, secure hashing
- **✅ Environment Security**: Validated secrets, production hardening
- **✅ Request Security**: CORS whitelisting, security headers, input validation
- **✅ Error Handling**: Sanitized responses, correlation IDs for debugging

---

## Part 1: API Security Architecture

### 1.1 Authentication System (JWT)

All protected endpoints require a Bearer token in the Authorization header:

```typescript
// Request example
GET /api/billing/subscription
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Using fetch
const response = await fetch('/api/billing/subscription', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Implementation Details:**
- Tokens expire after 1 hour (configurable via `TOKEN_EXPIRY` env var)
- HMAC-SHA256 signing prevents tampering
- Timing-safe comparison prevents timing attacks
- Token includes: userId, email, subscription tier

**Generate tokens server-side:**
```typescript
import { generateToken } from './server/src/auth';

const token = generateToken({
  userId: 'user-uuid',
  email: 'user@example.com',
  tier: 'pro'
});
```

### 1.2 API Rate Limiting

**Per-IP Rate Limiting (Development):**
- 100 requests per 15 minutes per IP
- Configurable via environment variables

**Per-Tier Rate Limiting (Production - Future):**
```typescript
// Limits will be enforced per subscription tier
{
  free: 50 requests/day,
  pro: 1000 requests/day,
  enterprise: unlimited
}
```

**Configure rate limiting:**
```bash
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # 100 requests per window
```

### 1.3 CORS Configuration

Only whitelisted origins can access the API:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://familyconnect.io
```

**Configuration in code:**
```typescript
// src/security-middleware.ts
const corsConfig = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected: ${origin}`);
      callback(new Error('Not allowed'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
};
```

### 1.4 Request Validation

All POST/PUT endpoints validate input using Zod schemas:

```typescript
// Example: Create member
const createMemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().max(200),
});

app.post('/api/members', 
  validateRequest(createMemberSchema),
  async (req, res) => {
    const validated = (req as any).validatedBody;
    // validated is guaranteed to match schema
  }
);
```

---

## Part 2: Data Protection

### 2.1 Encryption for PII (Personally Identifiable Information)

All sensitive user data is encrypted with AES-256-GCM:

**What gets encrypted:**
- First name, last name
- Birth dates
- Locations/addresses
- Email addresses (optional)
- Phone numbers (optional)

**Encryption flow:**
```typescript
import { encryptData, deriveEncryptionKey } from './server/src/data-protection';

// 1. Derive key from user's master password
const masterPassword = 'user-secret-password';
const { key, salt } = deriveEncryptionKey(masterPassword);

// 2. Encrypt sensitive data
const pii = {
  firstName: 'John',
  lastName: 'Smith',
  birthDate: '1950-01-15',
  location: 'Virginia, USA'
};

const encrypted = encryptData(JSON.stringify(pii), key);
// Result: { iv: '...', encryptedData: '...', authTag: '...', algorithm: 'aes-256-gcm' }

// 3. Store encrypted data in database
await database.saveMember({ id, encrypted, salt });

// 4. Decrypt when needed (only client-side)
const key = deriveEncryptionKey(masterPassword, Buffer.from(salt, 'base64'));
const decrypted = decryptData(encrypted, key.key);
const pii = JSON.parse(decrypted);
```

**Security guarantees:**
- ✅ Confidentiality: AES-256 encryption
- ✅ Authenticity: GCM authentication tag detects tampering
- ✅ Freshness: Random IV per encryption prevents replay attacks
- ✅ No plaintext in database

### 2.2 Password Hashing

Passwords are hashed with PBKDF2 (100,000 iterations):

```typescript
import { hashPassword, verifyPassword } from './server/src/auth';

// Hash during signup
const hash = hashPassword('user-password');
await database.saveUser({ email, passwordHash: hash });

// Verify during login
const hash = await database.getUserPassword(email);
const isValid = verifyPassword(inputPassword, hash);
```

**Why PBKDF2?**
- Industry-standard key derivation
- 100,000 iterations slows down brute force attacks
- For production, consider bcrypt or argon2

### 2.3 Token/Secret Hashing

Sensitive tokens (reset tokens, session tokens) are hashed before storage:

```typescript
import { generateResetToken } from './server/src/auth';

// Generate reset token for password recovery
const { token, hash, expiresAt } = generateResetToken();

// Return token to user (via email)
sendPasswordResetEmail(email, token);

// Store hash in database (not the token itself!)
await database.saveResetToken({ email, hash, expiresAt });

// Verify token
const storedHash = await database.getResetToken(email);
const providedHash = createHmac('sha256', JWT_SECRET)
  .update(userProvidedToken)
  .digest('hex');
const isValid = timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash));
```

---

## Part 3: Environment & Configuration Security

### 3.1 Required Environment Variables

Create `.env.local` (development) or `.env.production` (production):

```bash
# REQUIRED: API Configuration
GEMINI_API_KEY=AIza...                          # Gemini API key (min 20 chars)

# REQUIRED: Security
JWT_SECRET=your-random-32-character-secret     # Min 32 characters, alphanumeric
TOKEN_EXPIRY=3600                               # Token lifetime in seconds

# OPTIONAL: CORS
ALLOWED_ORIGINS=http://localhost:3000,https://familyconnect.io

# OPTIONAL: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000                     # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100                     # per window

# OPTIONAL: Encryption
PII_HASH_SALT=your-random-16-char-salt         # Min 16 characters

# OPTIONAL: Database (future)
DATABASE_URL=postgresql://user:pass@host/db

# OPTIONAL: Billing (future)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OPTIONAL: Email (future)
SENDGRID_API_KEY=SG....

# OPTIONAL: Deployment
NODE_ENV=production                             # development|staging|production
PORT=5174                                        # Server port
LOG_LEVEL=info                                   # debug|info|warn|error
```

### 3.2 Generate Strong Secrets

**Generate JWT_SECRET:**
```bash
# macOS/Linux
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

**Generate PII_HASH_SALT:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 3.3 Environment Validation

The app validates all environment variables on startup:

```typescript
import { validateEnvironment } from './server/src/config';

// Runs automatically when server starts
// Throws error if any required var is missing or invalid
validateEnvironment();

// Example output:
// ✓ Environment: production
// ✓ Port: 5174
// ✓ GEMINI_API_KEY: AIza...
// ✓ JWT_SECRET: (verified 32+ chars)
// ✓ All environment variables validated
```

### 3.4 Production Hardening

**Before deploying to production:**

1. **Change JWT_SECRET**
   ```bash
   # NEVER use default or development secret
   # Generate new 64-character secret
   ```

2. **Change PII_HASH_SALT**
   ```bash
   # NEVER use default salt
   ```

3. **Set NODE_ENV=production**
   ```bash
   # Enables stricter validation and optimization
   ```

4. **Whitelist origins**
   ```bash
   ALLOWED_ORIGINS=https://familyconnect.io,https://app.familyconnect.io
   ```

5. **Configure database**
   ```bash
   DATABASE_URL=postgresql://prod-user:secure-pass@prod-host/familyconnect
   ```

6. **Enable HTTPS**
   ```bash
   # Set up reverse proxy (nginx/Cloudflare) for TLS
   # Server will validate X-Forwarded-Proto header
   ```

---

## Part 4: Request & Response Security

### 4.1 Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: accelerometer=(), camera=(), ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; ...
```

**What each header does:**
- `X-Content-Type-Options: nosniff` → Prevents browser MIME sniffing
- `X-Frame-Options: DENY` → Prevents clickjacking attacks
- `CSP` → Restricts where scripts/styles can be loaded from
- `HSTS` → Forces HTTPS (production only)

### 4.2 Input Filtering

Suspicious requests are automatically blocked:

```typescript
// Blocked patterns:
// - Path traversal: ../, //, \
// - XSS attempts: <script>, javascript:
// - SQL injection: UNION SELECT, DROP TABLE
// - Code injection: exec(

// Example: This request is rejected
GET /api/users?id=1; DROP TABLE users;--
// Response: 400 Bad Request (Invalid request)
```

### 4.3 Request Logging

All requests are logged with correlation IDs for debugging:

```
[a3f2b1c4] GET /api/billing/usage from 192.168.1.100
[a3f2b1c4] 200 OK (125ms)
```

**What's logged (safe):**
- Correlation ID
- HTTP method & path
- Response status
- Response time
- Client IP

**What's NOT logged:**
- Authorization headers
- Request/response bodies
- Sensitive parameters (see sanitizeForLogging)

### 4.4 Error Handling

Errors are sanitized to prevent information leakage:

**Development responses (detailed):**
```json
{
  "error": "User email not found",
  "code": "USER_NOT_FOUND",
  "correlationId": "a3f2b1c4",
  "details": "Error: Cannot read property 'id' of null"
}
```

**Production responses (sanitized):**
```json
{
  "error": "An error occurred processing your request",
  "code": "INTERNAL_ERROR",
  "correlationId": "a3f2b1c4"
}
```

Use the correlation ID to find the full error in server logs.

---

## Part 5: Client-Side Security (Frontend)

### 5.1 Never Store Secrets Client-Side

**❌ DO NOT:**
```typescript
// NEVER store API keys in localStorage/sessionStorage
localStorage.setItem('GEMINI_API_KEY', apiKey);

// NEVER send API key in HTTP headers from browser
fetch('/api/endpoint', {
  headers: { 'X-API-Key': apiKey }  // ❌ WRONG
});

// NEVER embed secrets in code
const SECRET = 'sk_live_abc123...';  // ❌ Will be exposed in bundle
```

**✅ DO:**
```typescript
// Always proxy API calls through server
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello' })
  // Browser never sees GEMINI_API_KEY
});

// Use JWT token (user-specific, limited lifetime)
const response = await fetch('/api/billing/usage', {
  headers: {
    'Authorization': `Bearer ${userToken}`  // ✅ User-specific, expires
  }
});
```

### 5.2 Master Password for Vault Encryption

User's master password encrypts all family tree data:

```typescript
// On vault creation
const masterPassword = 'user-creates-strong-password';
const vaultKey = deriveEncryptionKey(masterPassword);

// Encrypt family tree
const encryptedVault = encryptData(JSON.stringify(familyTree), vaultKey);

// Master password is NEVER sent to server
// Only encrypted vault is stored
await saveMasterPassword(userId, encryptedVault);
```

**Master password best practices:**
- Must be 12+ characters
- Should include uppercase, lowercase, numbers, symbols
- Never share it with anyone (not even FamilyConnect support)
- Cannot be recovered if forgotten

### 5.3 HTTPS/TLS Only

**In production, always use HTTPS:**
```typescript
// Force HTTPS
if (window.location.protocol !== 'https:') {
  window.location.href = 'https:' + window.location.href;
}
```

---

## Part 6: Development Guidelines

### 6.1 Security Checklist for New Features

Before shipping a new feature:

- [ ] All inputs validated with Zod schemas
- [ ] All PII encrypted end-to-end
- [ ] No API keys logged or exposed to client
- [ ] Authentication required for sensitive operations
- [ ] Rate limits applied if needed
- [ ] Error messages sanitized (no stack traces to client)
- [ ] Security headers included in responses
- [ ] CORS origins whitelisted
- [ ] Tests pass (including security tests)
- [ ] Code reviewed by security-conscious developer

### 6.2 Common Vulnerabilities to Avoid

**1. SQL Injection** (if using SQL in future)
```typescript
// ❌ WRONG
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ CORRECT
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);
```

**2. XSS (Cross-Site Scripting)**
```typescript
// ❌ WRONG
const message = userInput;
element.innerHTML = message;  // Runs JavaScript

// ✅ CORRECT
element.textContent = message;  // Safe, treats as plain text
```

**3. CSRF (Cross-Site Request Forgery)**
```typescript
// ✅ Built-in: CORS + SameSite cookies prevent CSRF
// (No additional action needed for REST APIs)
```

**4. Sensitive Data in Logs**
```typescript
// ❌ WRONG
console.log('User login:', { email, password, token });

// ✅ CORRECT
console.log('User login:', sanitizeForLogging({ email }));
```

### 6.3 Testing Security

Run security tests:

```bash
# Run all tests
pnpm test

# Run security audit
bash scripts/security-audit.sh

# Check for hardcoded secrets
grep -r "password\|secret\|token\|apiKey" src/ --include="*.ts"

# Run npm security audit
npm audit
```

---

## Part 7: Incident Response

### 7.1 If API Key is Compromised

1. **Immediately:**
   - Delete the compromised key from Gemini API console
   - Generate a new key
   - Update `GEMINI_API_KEY` environment variable
   - Restart server

2. **Log review:**
   - Check server logs for unauthorized API usage
   - Look for unusual tokens or user accounts

3. **User notification:**
   - Inform users that API keys were rotated
   - Encourage users to reset passwords

### 7.2 If Database is Breached

1. **All user passwords are hashed** (PBKDF2) → Cannot be reversed
2. **All PII is encrypted** (AES-256-GCM) → Requires master password to decrypt
3. **All tokens are hashed** → Cannot be used directly

**User impact:** Minimal (no plaintext data exposed)

### 7.3 If JWT Secret is Exposed

1. **Immediately:**
   - Generate new JWT_SECRET
   - Update environment variable
   - Invalidate all existing tokens (hard logout all users)
   - Restart server

2. **User impact:** Users must log in again

---

## Part 8: Compliance & Privacy

### 8.1 GDPR Compliance

FamilyConnect implements GDPR best practices:

- ✅ User consent before data collection
- ✅ End-to-end encryption for PII
- ✅ Data minimization (only collect necessary data)
- ✅ User right to delete (encrypted data deleted on request)
- ✅ Privacy policy available
- ✅ No third-party tracking scripts

**User data deletion request:**
```typescript
// DELETE /api/users/{userId}
// Requires authentication
// Deletes all user data and encrypted vaults
```

### 8.2 Data Retention

- **Session tokens**: 1 hour
- **Reset tokens**: 15 minutes
- **Encrypted vaults**: Retained until user deletes
- **Activity logs**: 90 days (for audit)
- **Backups**: 30 days (for recovery)

---

## Part 9: Monitoring & Maintenance

### 9.1 Security Monitoring

Monitor logs for suspicious patterns:

```bash
# Monitor for failed authentication attempts
grep "AUTH_INVALID_TOKEN" server.log | wc -l

# Monitor for rate limit violations
grep "Too many requests" server.log

# Monitor for suspicious requests
grep "\[SECURITY\]" server.log
```

### 9.2 Regular Updates

**Weekly:**
- Run `npm audit` to check for dependency vulnerabilities
- Review new security patches for dependencies

**Monthly:**
- Rotate JWT_SECRET
- Audit access logs for anomalies
- Review error logs for exposures

**Quarterly:**
- Full security audit
- Penetration testing
- Code review of security-sensitive areas

### 9.3 Dependency Management

Keep dependencies updated:

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## References & Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Zod Validation](https://zod.dev/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
