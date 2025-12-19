# 🚀 Security Implementation Guide

## Quick Start (5 minutes)

### 1. Set Up Environment Variables

```bash
# Copy example to local development file
cp .env.example .env.local

# Generate strong secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('PII_HASH_SALT=' + require('crypto').randomBytes(16).toString('hex'))"

# Update .env.local with your generated secrets
# GEMINI_API_KEY=AIza...          (from Gemini console)
# JWT_SECRET=<paste-generated>
# PII_HASH_SALT=<paste-generated>
```

### 2. Start Server with Security Enabled

```bash
cd server
pnpm install
pnpm run dev
```

You should see:
```
✓ Environment: development
✓ Port: 5174
✓ GEMINI_API_KEY: AIza...
✓ JWT_SECRET: (verified 32+ chars)
✓ Allowed Origins: http://localhost:3000,...
✓ All environment variables validated
✓ Server running on http://localhost:5174
```

### 3. Test Authentication

```bash
# 1. Generate a token (server-side only)
node -e "
const { generateToken } = require('./server/dist/auth.js');
const token = generateToken({
  userId: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  tier: 'pro'
});
console.log('Token:', token);
"

# 2. Use token in API request
curl -H "Authorization: Bearer <token>" \
  http://localhost:5174/api/billing/subscription
```

---

## Detailed Implementation Steps

### Step 1: Configure Security Modules

All security modules are already in place:

**Files created:**
- ✅ `server/src/auth.ts` - JWT authentication
- ✅ `server/src/data-protection.ts` - Encryption & data protection
- ✅ `server/src/security-middleware.ts` - Request/response security
- ✅ `server/src/config.ts` - Environment validation

**Already integrated in `server/src/index.ts`:**
```typescript
import { authMiddleware, optionalAuthMiddleware } from './auth';
import { securityHeaders, securityContextMiddleware } from './security-middleware';
import { validateEnvironment, getEnvironment } from './config';

app.use(securityHeaders);           // Add security headers
app.use(securityContextMiddleware);  // Add correlation IDs
app.use(optionalAuthMiddleware);     // Auth if present
```

### Step 2: Protect API Endpoints

#### Option A: Require Authentication (Protected Endpoint)

```typescript
import { authMiddleware, requireTier } from './auth';

// Require valid JWT token
app.post('/api/billing/subscribe',
  authMiddleware,  // Validates token
  async (req, res) => {
    const user = (req as any).user;  // { userId, email, tier, ... }
    
    res.json({
      userId: user.userId,
      subscription: 'pro',
    });
  }
);

// Require specific tier (Pro or Enterprise)
app.get('/api/ai/advanced',
  authMiddleware,
  requireTier(['pro', 'enterprise']),
  async (req, res) => {
    // Only Pro/Enterprise users can access
  }
);
```

#### Option B: Optional Authentication (Public with Auth Benefits)

```typescript
import { optionalAuthMiddleware } from './auth';

// Works for anonymous + authenticated users
app.get('/api/plans',
  optionalAuthMiddleware,  // Auth if present, continues if not
  async (req, res) => {
    const user = (req as any).user;  // null if not authenticated
    
    if (user) {
      // Show personalized pricing
    } else {
      // Show generic pricing
    }
  }
);
```

#### Option C: Generate Token for User

```typescript
import { generateToken } from './auth';

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Verify email/password (example)
  const user = await database.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'AUTH_INVALID'
    });
  }
  
  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    tier: user.subscriptionTier,
  });
  
  res.json({ token });
});
```

### Step 3: Encrypt Sensitive Data

#### Encrypt User PII

```typescript
import { 
  validateAndSanitizePII, 
  createEncryptedPIIRecord,
  deriveEncryptionKey,
  encryptData
} from './data-protection';

app.post('/api/members', async (req, res) => {
  const pii = validateAndSanitizePII(req.body);
  
  // Get user's master password (from frontend)
  const masterPassword = req.headers['x-master-password'] as string;
  const { key } = deriveEncryptionKey(masterPassword);
  
  // Encrypt the data
  const encrypted = createEncryptedPIIRecord(
    'member-id-123',
    pii,
    key
  );
  
  // Store in database (only encrypted data, not plaintext)
  await database.saveMember(encrypted);
  
  res.json({ id: encrypted.id, status: 'encrypted' });
});
```

#### Decrypt When Needed

```typescript
import { decryptPIIRecord, importKey } from './data-protection';

app.get('/api/members/:id', authMiddleware, async (req, res) => {
  const masterPassword = req.headers['x-master-password'] as string;
  const { key } = deriveEncryptionKey(masterPassword);
  
  // Get encrypted record from database
  const encrypted = await database.getMember(req.params.id);
  
  // Decrypt it
  const pii = decryptPIIRecord(encrypted, key);
  
  res.json(pii);
});
```

### Step 4: Validate All Inputs

```typescript
import { validateRequest } from './security-middleware';
import { z } from 'zod';

const createMemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().max(200),
  email: z.string().email().optional(),
});

app.post('/api/members',
  authMiddleware,
  validateRequest(createMemberSchema),
  async (req, res) => {
    // req.body is guaranteed to match schema
    const validated = (req as any).validatedBody;
    
    // Safe to use validated data
    await database.createMember(validated);
    
    res.status(201).json({ status: 'created' });
  }
);
```

### Step 5: Hash Passwords Securely

```typescript
import { hashPassword, verifyPassword } from './auth';

// During user registration
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate password strength
  if (password.length < 12) {
    return res.status(400).json({
      error: 'Password must be at least 12 characters',
      code: 'WEAK_PASSWORD'
    });
  }
  
  // Hash password
  const passwordHash = hashPassword(password);
  
  // Store hash in database (never store plaintext)
  await database.createUser({
    email,
    passwordHash,
  });
  
  res.status(201).json({ status: 'user created' });
});

// During login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await database.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Verify password against hash
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate token for valid login
  const token = generateToken({
    userId: user.id,
    email: user.email,
    tier: user.subscriptionTier,
  });
  
  res.json({ token });
});
```

### Step 6: Add Request Validation Middleware

```typescript
import { validateRequest, validateQuery, validateParams } from './security-middleware';

// Validate request body
app.post('/api/items',
  validateRequest(z.object({
    name: z.string(),
    quantity: z.number().positive(),
  })),
  handler
);

// Validate query parameters
app.get('/api/items',
  validateQuery(z.object({
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  })),
  handler
);

// Validate URL parameters
app.delete('/api/items/:id',
  validateParams(z.object({
    id: z.string().uuid(),
  })),
  handler
);
```

### Step 7: Configure CORS for Production

Update `.env.production`:

```bash
# For production domain
ALLOWED_ORIGINS=https://familyconnect.io,https://app.familyconnect.io

# For staging
ALLOWED_ORIGINS=https://staging.familyconnect.io
```

The app automatically validates that requests come from whitelisted origins.

### Step 8: Enable HTTPS/TLS

**Option A: Using nginx as reverse proxy**

```nginx
server {
    listen 443 ssl http2;
    server_name familyconnect.io;
    
    ssl_certificate /etc/letsencrypt/live/familyconnect.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/familyconnect.io/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5174;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name familyconnect.io;
    return 301 https://$host$request_uri;
}
```

**Option B: Using Cloudflare**
- Add your domain to Cloudflare
- Enable SSL/TLS (flexible or full)
- Enable HSTS headers

---

## Testing Security Implementation

### 1. Unit Tests

```typescript
// server/src/__tests__/auth.test.ts
import { generateToken, verifyToken } from '../auth';

describe('JWT Authentication', () => {
  it('generates valid tokens', () => {
    const token = generateToken({
      userId: '123',
      email: 'test@example.com',
      tier: 'pro',
    });
    expect(token).toBeDefined();
  });
  
  it('verifies valid tokens', () => {
    const token = generateToken({
      userId: '123',
      email: 'test@example.com',
      tier: 'pro',
    });
    const decoded = verifyToken(token);
    expect(decoded?.userId).toBe('123');
  });
  
  it('rejects invalid tokens', () => {
    const decoded = verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });
});
```

### 2. Integration Tests

```typescript
// Test authentication middleware
describe('Authentication Middleware', () => {
  it('requires Bearer token', async () => {
    const res = await fetch('http://localhost:5174/api/billing/subscription');
    expect(res.status).toBe(401);
  });
  
  it('accepts valid token', async () => {
    const token = generateToken({ ... });
    const res = await fetch('http://localhost:5174/api/billing/subscription', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(res.status).toBe(200);
  });
});
```

### 3. Manual Testing

```bash
# Test missing token
curl http://localhost:5174/api/billing/subscription
# Expected: 401 Missing authentication token

# Test with valid token
TOKEN=$(node -e "const {generateToken} = require('./dist/auth'); console.log(generateToken({userId:'123',email:'user@example.com',tier:'pro'}))")
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5174/api/billing/subscription
# Expected: 200 OK

# Test with invalid token
curl -H "Authorization: Bearer invalid" \
  http://localhost:5174/api/billing/subscription
# Expected: 401 Invalid or expired token

# Test CORS rejection
curl -H "Origin: https://evil.com" \
  http://localhost:5174/api/billing/subscription
# Expected: CORS error

# Test rate limiting
for i in {1..101}; do
  curl http://localhost:5174/health
done
# Expected: 429 Too many requests after 100th request
```

---

## Common Issues & Solutions

### Issue 1: "JWT_SECRET not set"

**Error:**
```
CRITICAL: JWT_SECRET not set in production.
```

**Solution:**
```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.production
JWT_SECRET=<paste-output>
```

### Issue 2: "Invalid authorization header format"

**Error:**
```json
{ "error": "Invalid authorization header format" }
```

**Solution:**
Header must be:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```

NOT:
```
Authorization: eyJhbGciOiJIUzI1NiI...        // Missing "Bearer"
Authorization: Token eyJhbGciOiJIUzI1NiI... // Wrong scheme
```

### Issue 3: "Token expired"

**Error:**
```json
{ "error": "Invalid or expired token" }
```

**Solution:**
Generate a new token. Default expiry is 1 hour.

### Issue 4: CORS errors in browser

**Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
```bash
# Check ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=http://localhost:3000

# Ensure your frontend origin matches exactly
# (including protocol, domain, and port)
```

### Issue 5: "Too many requests"

**Error:**
```json
{ "error": "Too many requests, please try again later." }
```

**Solution:**
- Wait 15 minutes, or
- Increase `RATE_LIMIT_MAX_REQUESTS` in development

---

## Checklist: Before Going to Production

- [ ] Set `NODE_ENV=production`
- [ ] Generate new `JWT_SECRET` (don't use development secret)
- [ ] Generate new `PII_HASH_SALT` (don't use development salt)
- [ ] Set `GEMINI_API_KEY` to production key
- [ ] Configure `ALLOWED_ORIGINS` for your domain
- [ ] Set up HTTPS/TLS certificate
- [ ] Run `npm audit` (0 vulnerabilities)
- [ ] Run `bash scripts/security-audit.sh` (all checks pass)
- [ ] Test authentication flow end-to-end
- [ ] Test data encryption/decryption
- [ ] Review all error messages (no stack traces exposed)
- [ ] Set up monitoring/logging
- [ ] Create incident response plan
- [ ] Document all security configurations
- [ ] Have team review security setup

---

## Next Steps

1. **Read [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md)** for detailed guidance
2. **Follow [SECURITY_IMPLEMENTATION_CHECKLIST.md](./SECURITY_IMPLEMENTATION_CHECKLIST.md)** before launch
3. **Monitor logs** using correlation IDs to track requests
4. **Update dependencies** regularly with `npm audit fix`
5. **Rotate secrets** quarterly
