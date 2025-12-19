# FamilyConnect Subscription System - Quick Reference

## 📚 Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `types/billing.ts` | Subscription tier definitions, pricing, usage schemas |
| `server/src/usage-tracker.ts` | In-memory usage tracking (token, storage, members) |
| `server/src/billing-routes.ts` | API endpoints for billing, subscriptions, invoices |
| `doc/BILLING.md` | Comprehensive subscription plan documentation |
| `doc/BILLING_INTEGRATION.md` | Step-by-step integration guide with code examples |

### Modified Files
| File | Changes |
|------|---------|
| `server/src/index.ts` | Imported billing routes, usage tracking, added token counting |

---

## 💰 Subscription Tiers Summary

### Free Tier
- **Cost:** $0/month
- **API Tokens:** 50K/month (~50 calls)
- **Storage:** 1 GB
- **Family Members:** 100
- **Daily Requests:** 5
- **Best For:** Casual users, students

### Pro Tier ⭐
- **Cost:** $9.99/month (or $99/year)
- **API Tokens:** 5M/month (~5,000 calls)
- **Storage:** 10 GB
- **Family Members:** 2,000
- **Daily Requests:** 100
- **Best For:** Genealogy enthusiasts, family historians

### Enterprise Tier
- **Cost:** $49.99/month ($499/year)
- **API Tokens:** 50M/month (~50,000 calls)
- **Storage:** 1 TB (unlimited)
- **Family Members:** Unlimited
- **Daily Requests:** Unlimited
- **Best For:** Institutions, professional researchers

---

## 🔧 API Endpoints

### View Plans
```bash
GET /api/billing/plans
GET /api/billing/plans/:tier
```

### Check Usage
```bash
GET /api/billing/usage?month=2025-12
GET /api/billing/usage/history
GET /api/billing/usage/current-tier
```

### Manage Subscription
```bash
GET /api/billing/subscription
POST /api/billing/subscribe
PUT /api/billing/subscribe/:tier
DELETE /api/billing/subscribe
```

### View Invoices
```bash
GET /api/billing/invoices
GET /api/billing/invoices/:invoiceId
GET /api/billing/invoices/:invoiceId/download
```

### Usage Alerts
```bash
GET /api/billing/alerts
PUT /api/billing/alerts/:alertId/acknowledge
```

---

## 📊 Usage Tracking

### What's Tracked
- **API Tokens:** Text, image, video, audio calls
- **Storage:** Family data + evidence files
- **Family Members:** Count in vault
- **Requests:** Daily API calls

### How to Track (in API endpoints)

```typescript
// In any /api/ai/* endpoint:
const userId = req.body.userId;
const tokens = estimateTokenCount(prompt) + estimateTokenCount(response);
trackTokenUsage(userId, tokens, 'textGeneration');
```

### Get Usage
```typescript
const usage = getMonthlyUsage(userId, 'YYYY-MM');
console.log(usage.apiTokensUsed); // Token count
```

---

## 🎯 Cost Calculation

### Free Tier
```
Fixed: $0/month
```

### Pro Tier
```
Fixed: $9.99/month
Overage: $5 per 1M additional tokens (after 5M limit)
```

### Enterprise Tier
```
Base: $49.99/month
Overage Tokens: $5 per 1M tokens (after 50M limit)
Overage Storage: $0.99 per GB (after 1TB limit)
```

### Example: 1,000 Users
- 30% Free: 300 users × $0 = $0
- 60% Pro: 600 users × $9.99 = $5,994/month
- 10% Enterprise: 100 users × $49.99 = $4,999/month
- **Total MRR:** $10,993

---

## 🔐 Hard Limits vs Soft Limits

| Level | Threshold | Action |
|-------|-----------|--------|
| **Soft Limit** | 90% usage | Email alert sent |
| **Hard Limit** | 100% usage | Feature blocked, upgrade prompt |
| **Grace Period** | After cancellation | 90 days to recover data |

---

## ⚠️ In-Memory Storage Note

**Current Implementation:** Usage tracking is in-memory (resets on server restart)

**For Production:** Migrate to database
```typescript
// Replace in-memory Map with database queries:
const usage = await db.monthlyUsage.findOne({ userId, month });
```

See `doc/BILLING_INTEGRATION.md` for PostgreSQL schema.

---

## 🚀 Next Steps to Launch

### Phase 1: Database (Week 1)
- [ ] Create PostgreSQL schema
- [ ] Migrate from in-memory to DB storage
- [ ] Add user authentication (JWT)

### Phase 2: Stripe Integration (Week 2)
- [ ] Setup Stripe account
- [ ] Implement checkout flow
- [ ] Handle webhooks

### Phase 3: Enforcement (Week 3)
- [ ] Add hard limit blocking
- [ ] Implement rate limiting per tier
- [ ] Setup alert notifications

### Phase 4: Frontend (Week 4)
- [ ] Build billing dashboard
- [ ] Create upgrade/downgrade UI
- [ ] Add usage visualization

---

## 💡 Example: Free User Hitting Limit

```
User on Free tier
↓
Makes 5 AI calls (limit reached)
↓
Next call hits: enforceHardLimits(userId, usage, 'free')
↓
Response: 
{
  "error": "Daily request limit reached",
  "limit": 5,
  "used": 5,
  "resetAt": "2025-12-19T00:00:00Z"
}
↓
Frontend shows: "Upgrade to Pro for 100 calls/day"
↓
User clicks upgrade
↓
Redirects to Stripe checkout
↓
On success: Subscription created, tier updated to 'pro'
↓
User can now make 100 calls/day
```

---

## 🧪 Testing Usage Tracking

```typescript
// In Node REPL:
const { trackTokenUsage, getMonthlyUsage } = require('./server/src/usage-tracker');

// Track a call
trackTokenUsage('user-123', 1500, 'textGeneration');

// Check usage
const usage = getMonthlyUsage('user-123');
console.log(usage.apiTokensUsed); // 1500
console.log(usage.geminiCallsBreakdown.textGeneration); // 1500
```

---

## 📱 User Flows

### New User
1. Sign up → Free tier
2. Add family members
3. Try AI features
4. Hit daily limit → Upgrade prompt
5. Pay $9.99 → Upgraded immediately

### Upgrade Free → Pro
1. Click "Upgrade" button
2. Enter billing info (email, card)
3. Stripe checkout (30 seconds)
4. Invoice emailed
5. Tier changes immediately
6. Continue using app

### Cancel Subscription
1. Settings → Subscription
2. "Cancel Subscription" button
3. Choose: Now or End of Period
4. Data preserved 90 days
5. Confirmation email sent

---

## 🔗 Revenue Impact

**At 1,000 users:**
- Server/API cost: $5,800-9,200/month
- Estimated revenue: $11,000/month (with 70% paid conversion)
- **Profit margin: 30-40%** ✅

---

## 📖 Documentation

- **[BILLING.md](BILLING.md)** — Full subscription plan details
- **[BILLING_INTEGRATION.md](BILLING_INTEGRATION.md)** — Implementation guide with code
- **types/billing.ts** — TypeScript definitions
- **server/src/billing-routes.ts** — API endpoint code

---

## ❓ FAQ

**Q: Why three tiers?**
A: Covers 1) free users (acquisition), 2) paying users (sustainability), 3) enterprises (revenue).

**Q: Why track tokens instead of API calls?**
A: More fair—a 10KB response costs less than 1MB response, but both are "1 call".

**Q: What happens on server restart?**
A: Usage is reset (in-memory). Migration to DB fixes this.

**Q: Can users switch tiers mid-month?**
A: Yes. Pro-rating applies (refund old tier, charge new tier for remainder).

**Q: What if payment fails?**
A: 3-day retry, then 7-day grace period before suspension.

---

**Status:** ✅ Ready for database integration and Stripe setup
