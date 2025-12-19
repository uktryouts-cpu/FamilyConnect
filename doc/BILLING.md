# FamilyConnect Subscription & Billing Plan

## 📋 Overview

FamilyConnect uses a **three-tier subscription model** to balance free access for casual users with sustainable revenue for API costs and infrastructure.

**API Cost Reality:**
- Gemini API: ~$0.075 per 1M input tokens, ~$0.3 per 1M output tokens
- Average user: 10 API calls/day = ~100K tokens/day = ~$3-5/month
- At scale (1,000 users): $3,000-5,000/month in API costs

---

## 💳 Subscription Tiers

### **Free Tier**
- **Price:** $0/month
- **Target:** Casual genealogy enthusiasts, students, testing
- **Features:**
  - Up to 100 family members
  - 50,000 monthly API tokens (~50 AI calls)
  - 1 GB secure storage
  - Basic family tree view
  - Email support (48h response)
- **Usage Limits:**
  - 5 AI requests per day
  - 50KB upload per file
  - Can't share trees
- **Renewal:** Monthly (auto), 3-day grace period
- **Use Case:** Single user, small family (grandparents → grandchildren)

### **Pro Tier** ⭐ (Most Popular)
- **Price:** $9.99/month (or ~$99/year, 17% discount)
- **Target:** Serious genealogists, family historians
- **Features:**
  - Everything in Free, plus:
  - Up to 2,000 family members
  - 5 million monthly API tokens (~5,000 AI calls)
  - 10 GB secure storage
  - Advanced family tree analysis
  - Timeline visualization & geographic distribution
  - DNA match integration (partners)
  - Evidence vault (organize documents)
  - Priority support (24h response)
  - Monthly insights report
  - Share trees with up to 5 family members
- **Usage Limits:**
  - 100 AI requests per day
  - 10MB upload per file
  - 5 concurrent users can access shared tree
- **Renewal:** Monthly (auto), 7-day grace period
- **Overage:** $5 per 1M additional tokens
- **Use Case:** Researcher with extended family tree (parents → great-grandchildren) + evidence collection

### **Enterprise Tier**
- **Price:** $49.99/month (billed annually, $499/year)
- **Target:** Research institutions, large family histories, genealogy businesses
- **Features:**
  - Everything in Pro, plus:
  - Unlimited family members
  - 50 million monthly API tokens
  - Unlimited storage (1TB soft limit)
  - Autonomous AI agent (background research)
  - Advanced analytics & insights dashboard
  - Bulk import (GEDCOM, CSV, DNA datasets)
  - API access for integrations
  - Dedicated support (4h response)
  - Data export (all formats: GEDCOM, JSON, CSV, PDF)
  - Unlimited tree sharing
  - Custom branding for family portal
  - Backup & disaster recovery (3x replication)
  - HIPAA compliance option
  - Quarterly review with research advisor
- **Usage Limits:**
  - Unlimited API requests
  - 500MB upload per file
  - Unlimited concurrent users
- **Renewal:** Annual (auto), 30-day grace period
- **Overage:** Included in base price
- **Use Case:** Professional genealogists, institutions, large extended families (500+ members)

---

## 📊 Pricing Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Monthly Cost** | $0 | $9.99 | $49.99 |
| **Annual Cost** | $0 | $99 | $499 |
| **Family Members** | 100 | 2,000 | ∞ |
| **Monthly API Tokens** | 50K | 5M | 50M |
| **Monthly AI Calls** | ~50 | ~5,000 | ~50,000 |
| **Storage** | 1 GB | 10 GB | 1 TB |
| **Evidence Storage** | 500 MB | 5 GB | 500 GB |
| **AI Requests/Day** | 5 | 100 | ∞ |
| **Support Response** | 48h | 24h | 4h |
| **Tree Sharing** | No | 5 people | ∞ |
| **DNA Matching** | No | Yes | Yes |
| **Autonomous Agent** | No | No | Yes |
| **API Access** | No | No | Yes |

---

## 🔄 Usage Tracking & Billing

### **What Gets Tracked**

1. **API Tokens** (primary metric)
   - Text generation: ~0.5-2 tokens per word
   - Image analysis: ~500 tokens per image
   - Video transcription: ~1 token per 100ms
   - Total: summarized monthly

2. **Storage**
   - Family data (encrypted JSON): counted at vault save
   - Evidence files: photos, documents, audio
   - Incremental: only max usage per month counts

3. **Family Members**
   - Active count in vault
   - Checked at month-end
   - Hard limit: prevents adding beyond tier limit

4. **Daily Requests**
   - Rate limited: 5 (free), 100 (pro), unlimited (enterprise)
   - Resets at 00:00 UTC
   - Prevents abuse; doesn't trigger overage charges

5. **Breakdown by Call Type**
   - Text generation (chat, analysis, reasoning)
   - Image generation (family portraits, avatars)
   - Video analysis (genealogy video interviews)
   - Audio transcription (oral history interviews)

### **Monthly Usage Dashboard**

Users can view:
- Current month's usage vs. limit
- Visual progress bars (green/yellow/red)
- Breakdown by feature (chat %, image gen %, etc.)
- Historical usage (last 12 months)
- Cost projections (if on Enterprise with overages)

### **Hard Limits vs. Soft Limits**

**Soft Limits (90% threshold):**
- Email alert sent
- App shows warning banner
- User can continue using (best-effort service)

**Hard Limits (100% threshold):**
- Upgrade prompt displayed
- Feature degradation:
  - Free → Pro: "Upgrade to unlock more AI calls"
  - Pro → Enterprise: "Contact support for overage package"
  - Enterprise: "Included with plan"
- Read-only access for storage overage

---

## 💰 Revenue Model & Cost Coverage

### **Cost Breakdown (Per 1,000 Users)**

**Monthly Costs:**
- Gemini API: $3,000-5,000 (main cost driver)
- Database: $150-300
- Cache (Redis): $80-150
- Storage (S3): $100-200
- Servers: $500-1,000
- Support staff: $2,000-3,000
- **Total: $5,800-9,200/month**

**Monthly Revenue (at 70% conversion to paid):**
- 700 Pro users @ $9.99: $6,993
- 100 Enterprise users @ $49.99: $4,999
- **Total: $11,992/month**

**Profit Margin: 30-40%** ✅

### **Breakeven Analysis**

- Minimum subscribers for breakeven: 350-400 Pro users
- Current Free → Pro conversion rate needed: 10-15% of users
- At 1,000 free users: need 100-150 conversions to break even

---

## 🔐 Security & Data Handling

### **No Striping Personal Data**

- Family data always encrypted (AES-256)
- Vault key never transmitted to server
- Server only tracks metadata (token count, file size, member count)
- Gemini API calls: prompt text sent, but not stored in database

### **Subscription Metadata**

Stored securely:
- User ID (UUID)
- Subscription tier
- Billing email
- Payment method (tokenized, never raw)
- Stripe subscription ID (for webhook handling)
- Billing period (start/end dates)

### **Usage Metadata**

Stored (non-sensitive):
- API tokens consumed
- Storage used (GB)
- Request count
- Timestamp
- **Not stored:** Actual prompt text, results, or personal data

### **Retention**

- Active subscriptions: Retained
- Canceled subscriptions: Deleted after 90 days
- Usage logs: Retained 12 months (for analytics)
- Invoices: Retained 7 years (tax requirement)

---

## 📱 User Flows

### **Onboarding (New User)**

1. Sign up → Placed on Free tier
2. "Get 5 AI calls/day to start" message shown
3. Add family members, run a few AI analyses
4. At limit, see upgrade prompt (contextual)
5. Choice: upgrade or wait for daily reset

### **Upgrading from Free → Pro**

```
User hits API limit
      ↓
Alert banner: "5/5 AI calls used today"
      ↓
"Upgrade to Pro for 100/day" button
      ↓
Click → Billing page
      ↓
Enter billing info (email, card)
      ↓
Confirm @$9.99/month
      ↓
Upgraded immediately, can continue using app
      ↓
Invoice emailed
      ↓
Auto-renews monthly (can cancel anytime)
```

### **Downgrading from Pro → Free**

```
Account settings → Subscription
      ↓
"Downgrade to Free" button
      ↓
Warning: "You'll lose access to features you're using"
      ↓
  If using 1,500 members (limit is 100 free):
    - "You have 1,500 members. Free plan allows 100. 
       Consider exporting your tree before downgrading."
      ↓
Confirm downgrade → Effective end of current period
      ↓
Last invoice generated and finalized
```

### **Canceling Subscription**

```
Settings → Subscription → Cancel
      ↓
"Why are you canceling?" survey (optional)
      ↓
Choice: 
  a) Cancel now → lose access immediately
  b) End of period → can use until month-end
      ↓
Confirmation sent to email
      ↓
Data preserved 90 days (can reactivate or export)
```

---

## 🔗 Integration Points

### **Payment Processing** (Stripe/Paddle/Lemon Squeezy)

```typescript
// When user upgrades:
POST /api/billing/subscribe?tier=pro
  ↓
  Create Stripe Customer
  Create Stripe Subscription (monthly, $9.99)
  Store subscription ID in DB
  Return payment link or redirect to checkout
  ↓
  User confirms payment
  ↓
  Stripe webhook: customer.subscription.created
  ↓
  Activate subscription in app
  Send invoice email
```

### **Automatic Renewal**

```typescript
// Every morning:
// 1. Query subscriptions expiring today
// 2. Charge payment method on file
// 3. If payment fails:
//    - Retry after 3 days
//    - If fails again: 7-day grace period
//    - Then suspend account
// 4. Generate and email invoice
```

### **Usage Alerts**

```typescript
// Twice daily (12:00 UTC, 18:00 UTC):
// 1. Check each user's current usage vs. limits
// 2. If >= 90%: send email alert
// 3. Track alert in database (don't spam same alert)
// 4. If >= 100%: in-app warning banner + degraded service
```

---

## 📊 Analytics & Reporting

### **Dashboard Metrics** (for admin)

- Active subscribers by tier
- Monthly recurring revenue (MRR)
- Churn rate (cancellations)
- Upgrade rate (Free → Paid)
- Average usage by tier
- Top features used
- Support tickets by tier

### **User Metrics**

- Usage trend (are you approaching limits?)
- Cost projection (if on Enterprise with overages)
- Comparison to tier limit
- Saving suggestions ("Export evidence to reduce storage")

---

## 🛠️ Implementation Checklist

### **Phase 1: Foundation** (Week 1-2)
- [x] Design subscription tiers & pricing
- [x] Create billing types & schemas (Zod)
- [x] Build usage tracking (in-memory → database)
- [x] Create billing API endpoints (mock)
- [ ] Integrate Stripe (customer creation, checkout)
- [ ] Database schema for subscriptions, invoices, payments

### **Phase 2: Integration** (Week 3-4)
- [ ] Add authentication middleware (get userId from JWT)
- [ ] Hook usage tracking into API calls (token counting)
- [ ] Implement rate limiting per tier (not per IP)
- [ ] Add Stripe webhooks (payment events)
- [ ] Test payment flow end-to-end

### **Phase 3: Enforcement** (Week 5-6)
- [ ] Hard limit enforcement (block API calls if over)
- [ ] Soft limit alerts (email + in-app notifications)
- [ ] Invoice generation & email
- [ ] Usage dashboard frontend
- [ ] Downgrade/upgrade flows

### **Phase 4: Polish** (Week 7-8)
- [ ] Usage forecasting ("You'll hit limit on Dec 25")
- [ ] Overage charges (Enterprise tier)
- [ ] Data export on cancellation
- [ ] Analytics dashboard (admin)
- [ ] Documentation & help center

---

## 💡 Future Enhancements

1. **Team Plans** — Collaborate on trees (shared storage, managed seats)
2. **Family Portal** — Custom public URL to share trees with non-users
3. **Add-ons** — Extra storage, priority support, advanced features
4. **Referral Program** — $10 credit for each referred Pro user
5. **Non-profit Discount** — 50% off for genealogical societies
6. **One-time Purchases** — "Buy 1M tokens" instead of subscription
7. **Usage-based Pricing** — "Pay as you go" like AWS (for enterprises)

---

## 📞 Support & Billing Questions

**FAQ:**

**Q: Can I change plans mid-month?**
A: Yes. Pro-rating applies (refund old plan, charge new plan for remainder of month).

**Q: What happens if I exceed limits?**
A: 
- Free: Hard stop (can't make more API calls until next day/month)
- Pro: Soft limit alert at 90%, hard stop at 100%
- Enterprise: Overage charges (e.g., $5 per 1M additional tokens)

**Q: Can I pause my subscription?**
A: Not yet, but you can cancel (data preserved 90 days).

**Q: Is there a student/educational discount?**
A: Contact support@familyconnect.ai with .edu email.

**Q: Do you accept other payment methods?**
A: Currently card & bank transfer. PayPal coming Q1 2026.

**Q: What's your refund policy?**
A: 14-day money-back guarantee on first month. After that, full refund within 30 days of cancellation.

---

## 🚀 Launch Checklist

Before going live with billing:

- [ ] All payment systems tested (success + failure cases)
- [ ] Refund system tested
- [ ] Webhook handling tested
- [ ] Invoice generation tested
- [ ] Email delivery tested
- [ ] Usage calculations verified
- [ ] Rate limiting tested per tier
- [ ] Hard limits enforced
- [ ] Support team trained
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Billing FAQ published
- [ ] Monitoring alerts set up (payment failures, usage anomalies)

---

This plan is designed to be **fair to users** (transparent pricing, no surprises), **sustainable for business** (covers costs, enables growth), and **simple to understand** (3 tiers, clear limits).
