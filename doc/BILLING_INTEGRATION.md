/**
 * Billing Integration Guide
 * 
 * Step-by-step instructions for integrating subscription billing into FamilyConnect
 */

// ============================================================================
// STEP 1: Add userId to API Requests
// ============================================================================

// Client (services/gemini.ts)
async function chatWithAncestorPersona(
  member: FamilyMember,
  message: string,
  userId: string  // ADD THIS
): Promise<string> {
  const response = await fetch('/api/ai/chat-ancestor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      member,
      message,
      userId  // SEND TO SERVER
    })
  });
  return response.text();
}

// ============================================================================
// STEP 2: Database Schema (PostgreSQL)
// ============================================================================

/*
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  passwordHash VARCHAR NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR CHECK (tier IN ('free', 'pro', 'enterprise')),
  status VARCHAR CHECK (status IN ('active', 'past_due', 'canceled', 'suspended')),
  currentPeriodStart TIMESTAMP,
  currentPeriodEnd TIMESTAMP,
  canceledAt TIMESTAMP,
  stripeSubscriptionId VARCHAR,
  billingEmail VARCHAR,
  autoRenew BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId)
);

CREATE TABLE monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR NOT NULL,  -- YYYY-MM
  apiTokensUsed INTEGER DEFAULT 0,
  apiCallsCount INTEGER DEFAULT 0,
  storageUsedGB DECIMAL(10,2) DEFAULT 0,
  evidenceStorageGB DECIMAL(10,2) DEFAULT 0,
  familyMembersCount INTEGER DEFAULT 0,
  aiRequestsCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId, month),
  INDEX idx_user_month (userId, month)
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  subscriptionId UUID REFERENCES subscriptions(id),
  amount BIGINT NOT NULL,  -- In USD cents (e.g., 999 = $9.99)
  currency VARCHAR DEFAULT 'USD',
  status VARCHAR CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'refunded')),
  periodStart TIMESTAMP,
  periodEnd TIMESTAMP,
  dueDate TIMESTAMP,
  paidDate TIMESTAMP,
  stripeInvoiceId VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_status (userId, status)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoiceId UUID REFERENCES invoices(id),
  userId UUID REFERENCES users(id),
  amount BIGINT NOT NULL,
  currency VARCHAR DEFAULT 'USD',
  status VARCHAR CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  method VARCHAR,  -- 'card', 'bank_transfer', 'manual'
  transactionId VARCHAR UNIQUE,
  stripePaymentId VARCHAR,
  failureReason VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR,  -- 'soft_limit', 'hard_limit', 'approaching_limit'
  resource VARCHAR,  -- 'api_tokens', 'storage', 'requests_per_day', 'members'
  percentageUsed INTEGER,
  currentUsage INTEGER,
  limitValue INTEGER,
  sentAt TIMESTAMP DEFAULT NOW(),
  acknowledgedAt TIMESTAMP,
  INDEX idx_user_type (userId, type)
);
*/

// ============================================================================
// STEP 3: Stripe Integration (Example)
// ============================================================================

// In server/src/billing-routes.ts, add Stripe initialization:

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/api/billing/checkout', async (req, res) => {
  try {
    const { tier, userId, billingEmail } = req.body;
    const plan = SUBSCRIPTION_PLANS[tier];
    
    // Create Stripe customer
    let customer = await stripe.customers.list({
      email: billingEmail,
      limit: 1
    });
    
    if (customer.data.length === 0) {
      customer = await stripe.customers.create({
        email: billingEmail,
        metadata: { userId }
      });
    } else {
      customer = customer.data[0];
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: plan.description
            },
            unit_amount: Math.round(plan.monthlyPrice * 100),
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `https://familyconnect.app/billing?success=true`,
      cancel_url: `https://familyconnect.app/billing?canceled=true`
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Handle Stripe webhooks
router.post('/api/billing/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'customer.subscription.created':
        // Update subscription in DB
        const subscription = event.data.object;
        // INSERT INTO subscriptions (userId, tier, status, ...)
        break;
        
      case 'invoice.paid':
        // Mark invoice as paid
        const invoice = event.data.object;
        // UPDATE invoices SET status = 'paid' WHERE stripeInvoiceId = ...
        break;
        
      case 'invoice.payment_failed':
        // Send retry email
        const failedInvoice = event.data.object;
        // Send email alert
        break;
    }
    
    res.json({received: true});
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ============================================================================
// STEP 4: Rate Limiting per Tier (Middleware)
// ============================================================================

import { SUBSCRIPTION_PLANS } from '../../types/billing';

async function tierBasedRateLimiter(req, res, next) {
  const userId = req.user?.id; // From JWT middleware
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  // Get user's subscription tier
  const subscription = await db.subscriptions.findOne({ userId });
  const tier = subscription?.tier || 'free';
  const plan = SUBSCRIPTION_PLANS[tier];
  
  // Check daily request limit
  const today = new Date().toISOString().substring(0, 10);
  const todayRequests = await db.monthlyUsage.count({
    userId,
    createdAt: { $gte: new Date(`${today}T00:00:00Z`) }
  });
  
  if (todayRequests >= plan.limits.aiRequestsPerDay) {
    return res.status(429).json({
      error: 'Daily request limit reached',
      limit: plan.limits.aiRequestsPerDay,
      used: todayRequests,
      resetAt: new Date(`${today}T24:00:00Z`).toISOString()
    });
  }
  
  next();
}

app.use('/api/ai/', tierBasedRateLimiter);

// ============================================================================
// STEP 5: Hard Limit Enforcement
// ============================================================================

async function enforceHardLimits(userId, usage, tier) {
  const plan = SUBSCRIPTION_PLANS[tier];
  const violations = [];
  
  // Check token limit
  if (usage.apiTokensUsed > plan.limits.monthlyApiTokens) {
    violations.push('API tokens limit exceeded');
  }
  
  // Check storage limit
  if (usage.storageUsedGB > plan.limits.monthlyStorageGB) {
    violations.push('Storage limit exceeded');
  }
  
  // Check member limit
  if (usage.familyMembersCount > plan.limits.maxFamilyMembers) {
    violations.push('Family member limit exceeded');
  }
  
  if (violations.length > 0) {
    return {
      blocked: true,
      violations,
      upgradeLink: '/api/billing/upgrade'
    };
  }
  
  return { blocked: false };
}

// Use in API endpoints:
app.post('/api/ai/some-endpoint', async (req, res) => {
  const userId = req.user.id;
  
  // Check limits before processing
  const usage = await getMonthlyUsage(userId);
  const subscription = await db.subscriptions.findOne({ userId });
  const limits = enforceHardLimits(userId, usage, subscription.tier);
  
  if (limits.blocked) {
    return res.status(402).json({
      error: 'Upgrade required',
      violations: limits.violations,
      upgradeUrl: limits.upgradeLink
    });
  }
  
  // Process request...
});

// ============================================================================
// STEP 6: Automatic Invoice Generation
// ============================================================================

// Scheduled job (runs daily at 2 AM UTC)
async function generateAndSendInvoices() {
  const now = new Date();
  
  // Find subscriptions that renew today
  const renewingSubscriptions = await db.subscriptions.find({
    currentPeriodEnd: {
      $gte: new Date(now.getTime() - 24*60*60*1000),
      $lt: new Date(now.getTime() + 24*60*60*1000)
    }
  });
  
  for (const sub of renewingSubscriptions) {
    const usage = await getMonthlyUsage(sub.userId, now.toISOString().substring(0, 7));
    const plan = SUBSCRIPTION_PLANS[sub.tier];
    
    // Calculate charge
    let amount = plan.monthlyPrice;
    if (sub.tier === 'enterprise' && usage) {
      // Add overages
      if (usage.apiTokensUsed > plan.limits.monthlyApiTokens) {
        const overageTokens = usage.apiTokensUsed - plan.limits.monthlyApiTokens;
        amount += (overageTokens / 1_000_000) * 5; // $5 per 1M tokens
      }
    }
    
    // Create invoice
    const invoice = await db.invoices.create({
      userId: sub.userId,
      subscriptionId: sub.id,
      amount: Math.round(amount * 100),
      status: 'sent',
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      dueDate: new Date(sub.currentPeriodEnd.getTime() + 10*24*60*60*1000)
    });
    
    // Send email
    await sendEmail(sub.billingEmail, {
      subject: `FamilyConnect Invoice #${invoice.id}`,
      template: 'invoice',
      data: { invoice, plan }
    });
    
    // Update subscription period
    await db.subscriptions.updateOne(
      { id: sub.id },
      {
        currentPeriodStart: sub.currentPeriodEnd,
        currentPeriodEnd: new Date(sub.currentPeriodEnd.getTime() + 30*24*60*60*1000)
      }
    );
  }
}

// Schedule with node-cron
const cron = require('node-cron');
cron.schedule('0 2 * * *', generateAndSendInvoices);

// ============================================================================
// STEP 7: Usage Notifications
// ============================================================================

// Scheduled job (runs twice daily at 12:00 and 18:00 UTC)
async function sendUsageAlerts() {
  const users = await db.users.find({});
  
  for (const user of users) {
    const subscription = await db.subscriptions.findOne({ userId: user.id });
    if (!subscription || subscription.status !== 'active') continue;
    
    const usage = await getMonthlyUsage(user.id);
    const plan = SUBSCRIPTION_PLANS[subscription.tier];
    
    // Check tokens
    const tokenPercent = (usage.apiTokensUsed / plan.limits.monthlyApiTokens) * 100;
    if (tokenPercent >= 90) {
      const existingAlert = await db.usageAlerts.findOne({
        userId: user.id,
        resource: 'api_tokens',
        type: tokenPercent >= 100 ? 'hard_limit' : 'approaching_limit',
        sentAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
      });
      
      if (!existingAlert) {
        await sendEmail(user.email, {
          subject: 'Usage Alert: API Tokens',
          template: 'usage-alert',
          data: {
            resource: 'API Tokens',
            percent: tokenPercent,
            current: usage.apiTokensUsed,
            limit: plan.limits.monthlyApiTokens
          }
        });
      }
    }
  }
}

cron.schedule('0 12,18 * * *', sendUsageAlerts);

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/*
 [ ] Create types/billing.ts with subscription schemas
 [ ] Create server/src/usage-tracker.ts for token tracking
 [ ] Create server/src/billing-routes.ts with API endpoints
 [ ] Create PostgreSQL database schema (migrations)
 [ ] Setup Stripe account and get API keys
 [ ] Integrate Stripe checkout session creation
 [ ] Implement Stripe webhook handling
 [ ] Add tier-based rate limiting middleware
 [ ] Add hard limit enforcement
 [ ] Add usage monitoring and alerts
 [ ] Setup scheduled jobs (invoice generation, alerts)
 [ ] Add JWT authentication middleware
 [ ] Create billing UI (React component)
 [ ] Setup email templates (invoices, alerts, receipts)
 [ ] Add refund/chargeback handling
 [ ] Test end-to-end payment flow
 [ ] Setup accounting integration (QuickBooks, Xero)
 [ ] Configure webhook retries and error handling
 [ ] Setup monitoring/alerting for billing issues
 [ ] Document for support team
 [ ] Create runbook for common issues
 */
