# ✅ Security Implementation Checklist

## Pre-Launch Security Verification (Use Before Production)

### Environment Security
- [ ] `GEMINI_API_KEY` is set and valid (min 20 characters)
- [ ] `JWT_SECRET` is set and at least 32 characters
- [ ] `JWT_SECRET` doesn't contain "dev", "test", or development patterns
- [ ] `PII_HASH_SALT` is set and at least 16 characters
- [ ] `ALLOWED_ORIGINS` contains only production domains (no localhost)
- [ ] `NODE_ENV` is set to "production"
- [ ] `.env.local` and `.env` files are in `.gitignore` (NEVER commit secrets)
- [ ] `.env.production` is stored securely (AWS Secrets Manager, Vault, etc.)

### API Security
- [ ] All API endpoints require authentication (JWT Bearer token)
- [ ] Rate limiting is enabled (100 requests/15 min per IP)
- [ ] CORS is configured with whitelist only (no * wildcard)
- [ ] All POST/PUT endpoints validate input with Zod schemas
- [ ] Error responses don't leak stack traces or internal details
- [ ] Security headers are present in all responses
- [ ] HTTPS/TLS is enforced (redirect HTTP to HTTPS)
- [ ] Authorization header is required for protected routes

### Data Protection
- [ ] All PII (names, dates, locations) is encrypted with AES-256-GCM
- [ ] User passwords are hashed with PBKDF2 (100,000 iterations)
- [ ] JWT tokens are signed with HMAC-SHA256
- [ ] Reset tokens are hashed before storage
- [ ] Encryption keys are derived from user's master password
- [ ] No plaintext secrets are logged anywhere
- [ ] Sensitive data is redacted in error messages

### Code Security
- [ ] No hardcoded API keys or passwords in source code
- [ ] No secrets in version control (checked with `git grep`)
- [ ] No `eval()`, `exec()`, or dynamic code execution
- [ ] SQL injection protection (parameterized queries if using SQL)
- [ ] XSS protection (text content, not innerHTML for user input)
- [ ] CSRF tokens implemented for state-changing operations
- [ ] Input validation on all user-facing endpoints
- [ ] TypeScript strict mode enabled (`strict: true` in tsconfig.json)

### Testing & Validation
- [ ] Unit tests pass (`pnpm test`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Security audit passes (`bash scripts/security-audit.sh`)
- [ ] npm audit shows 0 vulnerabilities (`npm audit`)
- [ ] TypeScript compilation has 0 errors (`pnpm build`)
- [ ] No console.log() statements leaking sensitive data
- [ ] All endpoints tested with invalid/malicious input

### Infrastructure
- [ ] HTTPS/TLS certificate is valid and non-expired
- [ ] Reverse proxy (nginx/Cloudflare) is configured
- [ ] Security headers are served from server (not just proxy)
- [ ] X-Forwarded-Proto header is validated
- [ ] Server is running behind a WAF (Web Application Firewall) - optional
- [ ] Database connection uses SSL/TLS
- [ ] Database credentials are environment variables (not hardcoded)

### Monitoring & Logging
- [ ] Error logging is enabled with correlation IDs
- [ ] Suspicious request patterns trigger alerts
- [ ] Failed authentication attempts are logged
- [ ] Rate limit violations are logged
- [ ] Logs are rotated and archived (not lost)
- [ ] Sensitive data is sanitized in logs
- [ ] Logs are searchable for security incidents

### User Facing
- [ ] Password reset flow uses time-limited tokens (15 min expiry)
- [ ] Session tokens expire after inactivity (1 hour default)
- [ ] Users can view/manage their API keys
- [ ] Users can revoke/regenerate tokens
- [ ] Users are notified of new logins from unusual locations
- [ ] Account lockout after N failed login attempts
- [ ] Two-factor authentication (2FA) is available - optional

### Documentation
- [ ] Security Best Practices guide is available
- [ ] All environment variables are documented
- [ ] Incident response plan is documented
- [ ] Data retention policy is documented
- [ ] Privacy policy matches implementation
- [ ] Terms of Service address security responsibilities

---

## Post-Launch Maintenance Checklist (Weekly)

- [ ] Run `npm audit` and fix critical vulnerabilities
- [ ] Review server error logs for suspicious patterns
- [ ] Check authentication failure logs for brute force attempts
- [ ] Verify HTTPS certificate is still valid
- [ ] Confirm all services are healthy and responsive
- [ ] Spot-check database backup integrity

---

## Monthly Security Review Checklist

- [ ] Run security audit: `bash scripts/security-audit.sh`
- [ ] Review and rotate API keys if compromised
- [ ] Update all dependencies: `npm update`
- [ ] Review access logs for anomalies
- [ ] Verify CORS whitelist is still correct
- [ ] Test password reset flow
- [ ] Test account lockout mechanism
- [ ] Review user-reported security issues

---

## Quarterly Security Assessment Checklist

- [ ] Full penetration testing (internal or external)
- [ ] Security code review of new features
- [ ] Database encryption status verification
- [ ] Disaster recovery plan testing
- [ ] User data breach simulation (tabletop exercise)
- [ ] Review and update incident response plan
- [ ] Verify GDPR compliance
- [ ] Update security documentation

---

## Security Incident Response Checklist

### If API Key is Exposed:
- [ ] Revoke compromised key immediately in Gemini console
- [ ] Generate new API key
- [ ] Update GEMINI_API_KEY environment variable
- [ ] Restart all server instances
- [ ] Review API usage logs for unauthorized calls
- [ ] Document incident with timestamp and scope
- [ ] Notify security team / stakeholders

### If Database is Breached:
- [ ] Immediately take affected database offline (if needed)
- [ ] Notify all users of breach via email
- [ ] Change all admin credentials
- [ ] Rotate database encryption keys
- [ ] Verify no plaintext data was exposed (data is encrypted)
- [ ] Conduct forensic analysis
- [ ] Update Privacy Policy with incident details
- [ ] Enable enhanced monitoring

### If JWT Secret is Compromised:
- [ ] Generate new JWT_SECRET immediately
- [ ] Update environment variable on all servers
- [ ] Invalidate all existing tokens (force all users to logout)
- [ ] Restart all server instances simultaneously
- [ ] Notify users that security session has been reset
- [ ] Monitor for unauthorized token usage in logs

### If User Account is Compromised:
- [ ] Force logout all sessions for affected user
- [ ] Reset user's password
- [ ] Require 2FA re-setup
- [ ] Review user's activity logs for suspicious actions
- [ ] Notify user of suspicious activity
- [ ] Offer identity protection if data was accessed
- [ ] Document incident

---

## Security Configuration Template

Copy this to `.env.production` before deploying:

```bash
# ============================================================================
# 🔒 SECURITY CONFIGURATION - PRODUCTION
# ============================================================================

# Application
NODE_ENV=production
PORT=5174
LOG_LEVEL=info

# API Configuration
GEMINI_API_KEY=                          # ← REQUIRED: Set from Gemini console

# Security (REQUIRED - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=                              # ← REQUIRED: Random 32+ char string
TOKEN_EXPIRY=3600                        # ← 1 hour token lifetime

# CORS (REQUIRED - Set to your domain)
ALLOWED_ORIGINS=https://familyconnect.io,https://app.familyconnect.io

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000              # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100              # per window per IP

# Data Protection (REQUIRED - Generate: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
PII_HASH_SALT=                           # ← REQUIRED: Random 16+ char string

# Database (REQUIRED for production)
DATABASE_URL=postgresql://username:password@hostname:5432/familyconnect

# Stripe (if billing enabled)
STRIPE_SECRET_KEY=sk_live_               # ← Set if ENABLE_BILLING=true
STRIPE_WEBHOOK_SECRET=whsec_

# Email Service
SENDGRID_API_KEY=SG.                     # ← Set for transactional emails

# Feature Flags
ENABLE_BILLING=false                     # Enable subscription system
ENABLE_AUTHENTICATION=true               # Enable JWT authentication

# ============================================================================
# ⚠️  CRITICAL SECURITY REMINDERS
# ============================================================================
# 1. NEVER commit this file to git
# 2. NEVER share secrets via email or chat
# 3. NEVER use development/test values in production
# 4. Store secrets in a secure vault (AWS Secrets Manager, HashiCorp Vault)
# 5. Rotate secrets quarterly
# 6. Delete this file after deployment
# ============================================================================
```

---

## Security Testing Commands

```bash
# Run all security checks
bash scripts/security-audit.sh

# Check for hardcoded secrets
grep -r "password\|secret\|token\|apiKey" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --include="*.ts" \
  --include="*.tsx"

# Check npm dependencies
npm audit

# TypeScript strict mode check
pnpm build

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Check git for secrets (if installed)
git secrets --scan

# Docker image security scan (if using containers)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image familyconnect:latest
```

---

## Secure Onboarding Checklist (For New Team Members)

- [ ] Receive read-only access to codebase
- [ ] Read and sign security agreement
- [ ] Complete security training (OWASP Top 10)
- [ ] Set up local development environment with `.env.local`
- [ ] Never request production secrets (access via secure vault only)
- [ ] Never commit secrets or API keys
- [ ] Use branch protection rules (require code review)
- [ ] Enable 2FA on GitHub/GitLab account
- [ ] Sign up for security notifications (GitHub Dependabot)

---

## Quick Reference: Common Security Mistakes

| Mistake | Why It's Bad | Solution |
|---------|-------------|----------|
| Storing API keys in `.env.local` and committing to git | Exposed to anyone with repo access | Add `.env.local` to `.gitignore` |
| Logging full request/response with auth tokens | Tokens visible in logs | Use `sanitizeForLogging()` |
| Trusting user input without validation | XSS, injection attacks possible | Validate all inputs with Zod |
| Sending error stack traces to client | Reveals internal structure | Sanitize errors in production |
| Using HTTP instead of HTTPS | Man-in-the-middle attacks | Enforce HTTPS/TLS only |
| No rate limiting | DDoS and brute force attacks | Enable rate limiting on all API routes |
| Storing plaintext passwords | Hacked database = compromised accounts | Use bcrypt/argon2/PBKDF2 |
| No input size limits | Memory exhaustion attacks | Set request size limits (1-5MB) |
| Weak encryption keys | Keys can be brute forced | Use cryptographically secure random generation |
| No CORS configuration | CSRF attacks possible | Whitelist specific origins |

