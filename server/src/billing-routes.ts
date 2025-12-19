/**
 * Subscription API Routes
 * 
 * Endpoints for managing subscriptions, viewing usage, and handling billing
 */

import express from 'express';
import { 
  SUBSCRIPTION_PLANS, 
  SubscriptionTierType,
  calculateMonthlyCharge,
  checkHardLimits,
  getUsagePercentage
} from '../../types/billing';
import {
  getMonthlyUsage,
  getUserAllUsage,
  trackTokenUsage,
  trackStorageUsage,
  trackFamilyMembersCount
} from './usage-tracker';
import { z } from 'zod';

const router = express.Router();

// ============================================================================
// SUBSCRIPTION TIER ENDPOINTS
// ============================================================================

/**
 * GET /api/billing/plans
 * Get all available subscription plans
 */
router.get('/api/billing/plans', (req, res) => {
  const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    tier: plan.tier,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    description: plan.description,
    features: plan.features,
    limits: plan.limits
  }));
  
  res.json({ plans });
});

/**
 * GET /api/billing/plans/:tier
 * Get details for a specific subscription tier
 */
router.get('/api/billing/plans/:tier', (req, res) => {
  const { tier } = req.params;
  const plan = SUBSCRIPTION_PLANS[tier as SubscriptionTierType];
  
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  
  res.json({ plan });
});

// ============================================================================
// USAGE ENDPOINTS
// ============================================================================

/**
 * GET /api/billing/usage
 * Get current month's usage for authenticated user
 * 
 * Query params:
 *   - month: YYYY-MM format (optional, defaults to current)
 */
router.get('/api/billing/usage', (req, res) => {
  const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
  const month = req.query.month as string;
  
  const usage = getMonthlyUsage(userId, month);
  
  if (!usage) {
    return res.json({
      userId,
      month: month || new Date().toISOString().substring(0, 7),
      apiTokensUsed: 0,
      apiCallsCount: 0,
      storageUsedGB: 0,
      message: 'No usage recorded for this period'
    });
  }
  
  res.json(usage);
});

/**
 * GET /api/billing/usage/history
 * Get usage history for all months
 */
router.get('/api/billing/usage/history', (req, res) => {
  const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
  
  const history = getUserAllUsage(userId);
  
  res.json({
    userId,
    months: Object.keys(history).sort().reverse(),
    usage: history
  });
});

/**
 * GET /api/billing/usage/current-tier
 * Get current subscription tier and usage percentage
 */
router.get('/api/billing/usage/current-tier', (req, res) => {
  const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
  const tier = (req.query.tier as SubscriptionTierType) || 'free'; // TODO: Get from subscription record
  
  const currentMonthUsage = getMonthlyUsage(userId);
  const plan = SUBSCRIPTION_PLANS[tier];
  
  if (!currentMonthUsage) {
    return res.json({
      tier,
      plan: {
        name: plan.name,
        monthlyPrice: plan.monthlyPrice
      },
      usage: {
        apiTokensPercentage: 0,
        storagePercentage: 0,
        membersPercentage: 0
      },
      limits: plan.limits,
      status: 'good'
    });
  }
  
  const apiTokensPercent = Math.min(100, (currentMonthUsage.apiTokensUsed / plan.limits.monthlyApiTokens) * 100);
  const storagePercent = Math.min(100, (currentMonthUsage.storageUsedGB / plan.limits.monthlyStorageGB) * 100);
  const membersPercent = plan.limits.maxFamilyMembers === Infinity 
    ? 0 
    : Math.min(100, (currentMonthUsage.familyMembersCount / plan.limits.maxFamilyMembers) * 100);
  
  // Determine status
  let status = 'good';
  if (apiTokensPercent >= 90 || storagePercent >= 90) {
    status = 'warning';
  }
  if (apiTokensPercent >= 100 || storagePercent >= 100) {
    status = 'critical';
  }
  
  res.json({
    tier,
    plan: {
      name: plan.name,
      monthlyPrice: plan.monthlyPrice
    },
    usage: {
      apiTokensUsed: currentMonthUsage.apiTokensUsed,
      apiTokensLimit: plan.limits.monthlyApiTokens,
      apiTokensPercentage: apiTokensPercent,
      
      storageUsedGB: currentMonthUsage.storageUsedGB,
      storageLimit: plan.limits.monthlyStorageGB,
      storagePercentage: storagePercent,
      
      membersCount: currentMonthUsage.familyMembersCount,
      membersLimit: plan.limits.maxFamilyMembers,
      membersPercentage: membersPercent
    },
    limits: plan.limits,
    status,
    breakdown: currentMonthUsage.geminiCallsBreakdown
  });
});

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * POST /api/billing/subscribe
 * Subscribe to a tier
 * 
 * Body: { tier: 'pro' | 'enterprise', billingEmail: string }
 */
router.post('/api/billing/subscribe', (req, res) => {
  try {
    const { tier, billingEmail } = req.body;
    const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
    
    // Validate tier
    if (!SUBSCRIPTION_PLANS[tier as SubscriptionTierType]) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    const plan = SUBSCRIPTION_PLANS[tier as SubscriptionTierType];
    
    // TODO: Integrate with Stripe/payment processor
    // For now, create mock subscription
    const subscription = {
      id: `sub_${Date.now()}`,
      userId,
      tier,
      status: 'active',
      billingEmail,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      autoRenew: true,
      createdAt: new Date()
    };
    
    res.json({
      message: `Successfully subscribed to ${plan.name} plan`,
      subscription,
      nextBillingDate: subscription.currentPeriodEnd,
      monthlyCharge: plan.monthlyPrice
    });
  } catch (error) {
    res.status(500).json({ error: 'Subscription creation failed' });
  }
});

/**
 * PUT /api/billing/subscribe/:tier
 * Upgrade or downgrade subscription
 */
router.put('/api/billing/subscribe/:tier', (req, res) => {
  try {
    const { tier } = req.params;
    const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
    
    if (!SUBSCRIPTION_PLANS[tier as SubscriptionTierType]) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    const plan = SUBSCRIPTION_PLANS[tier as SubscriptionTierType];
    
    // TODO: Handle proration (refund unused days, charge partial month)
    
    const updatedSubscription = {
      userId,
      tier,
      status: 'active',
      previousTier: 'pro', // TODO: Get from database
      changeDate: new Date(),
      nextBillingAmount: plan.monthlyPrice,
      message: 'Subscription updated. Changes take effect immediately.'
    };
    
    res.json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ error: 'Subscription update failed' });
  }
});

/**
 * DELETE /api/billing/subscribe
 * Cancel subscription
 */
router.delete('/api/billing/subscribe', (req, res) => {
  try {
    const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
    const { immediate } = req.body; // true = cancel now, false = end of period
    
    const canceledAt = immediate ? new Date() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    res.json({
      message: 'Subscription canceled',
      canceledAt,
      reason: immediate 
        ? 'You will lose access immediately' 
        : 'You will lose access at the end of your current billing period',
      dataRetention: 'Your data is preserved for 90 days. Download your family tree before losing access.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Subscription cancellation failed' });
  }
});

/**
 * GET /api/billing/subscription
 * Get current subscription status
 */
router.get('/api/billing/subscription', (req, res) => {
  const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
  
  // TODO: Get from database
  const subscription = {
    tier: 'free',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    monthlyPrice: 0,
    autoRenew: true,
    createdAt: new Date()
  };
  
  res.json(subscription);
});

// ============================================================================
// BILLING / INVOICES
// ============================================================================

/**
 * GET /api/billing/invoices
 * Get invoices for authenticated user
 * 
 * Query params:
 *   - status: 'paid' | 'pending' | 'failed' (optional)
 */
router.get('/api/billing/invoices', (req, res) => {
  const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
  const status = req.query.status as string;
  
  // TODO: Query from database
  const mockInvoices = [
    {
      id: 'inv_1001',
      amount: 999, // $9.99
      currency: 'USD',
      status: 'paid',
      period: {
        start: new Date('2025-12-01'),
        end: new Date('2025-12-31')
      },
      dueDate: new Date('2025-12-10'),
      paidDate: new Date('2025-12-05'),
      total: 999
    }
  ];
  
  const filtered = status 
    ? mockInvoices.filter(inv => inv.status === status)
    : mockInvoices;
  
  res.json({
    invoices: filtered,
    total: filtered.length
  });
});

/**
 * GET /api/billing/invoices/:invoiceId
 * Get invoice details
 */
router.get('/api/billing/invoices/:invoiceId', (req, res) => {
  const { invoiceId } = req.params;
  
  // TODO: Get from database
  const invoice = {
    id: invoiceId,
    amount: 999,
    currency: 'USD',
    status: 'paid',
    period: {
      start: new Date('2025-12-01'),
      end: new Date('2025-12-31')
    },
    lineItems: [
      {
        description: 'Pro Subscription - December',
        quantity: 1,
        unitPrice: 999,
        total: 999
      }
    ],
    subtotal: 999,
    tax: 0,
    taxRate: 0,
    total: 999,
    dueDate: new Date('2025-12-10'),
    paidDate: new Date('2025-12-05')
  };
  
  res.json(invoice);
});

/**
 * GET /api/billing/invoices/:invoiceId/download
 * Download invoice as PDF
 */
router.get('/api/billing/invoices/:invoiceId/download', (req, res) => {
  const { invoiceId } = req.params;
  
  // TODO: Generate PDF from invoice data
  res.type('application/pdf').send(Buffer.from('PDF content placeholder'));
});

// ============================================================================
// USAGE ALERTS
// ============================================================================

/**
 * GET /api/billing/alerts
 * Get usage alerts for authenticated user
 */
router.get('/api/billing/alerts', (req, res) => {
  const userId = req.query.userId as string || 'anonymous'; // TODO: Get from auth
  const tier = (req.query.tier as SubscriptionTierType) || 'free';
  
  const usage = getMonthlyUsage(userId);
  const plan = SUBSCRIPTION_PLANS[tier];
  
  const alerts = [];
  
  if (!usage) {
    return res.json({ alerts: [] });
  }
  
  // Check API tokens
  const tokenPercent = (usage.apiTokensUsed / plan.limits.monthlyApiTokens) * 100;
  if (tokenPercent >= 90) {
    alerts.push({
      id: `alert_tokens_${Date.now()}`,
      type: tokenPercent >= 100 ? 'hard_limit' : 'approaching_limit',
      resource: 'api_tokens',
      message: `You've used ${tokenPercent.toFixed(1)}% of your monthly API tokens`,
      percentageUsed: tokenPercent,
      currentUsage: usage.apiTokensUsed,
      limit: plan.limits.monthlyApiTokens,
      action: tier === 'free' ? 'Upgrade to Pro' : 'Contact support for overage'
    });
  }
  
  // Check storage
  const storagePercent = (usage.storageUsedGB / plan.limits.monthlyStorageGB) * 100;
  if (storagePercent >= 90) {
    alerts.push({
      id: `alert_storage_${Date.now()}`,
      type: storagePercent >= 100 ? 'hard_limit' : 'approaching_limit',
      resource: 'storage',
      message: `You've used ${storagePercent.toFixed(1)}% of your storage limit`,
      percentageUsed: storagePercent,
      currentUsage: usage.storageUsedGB,
      limit: plan.limits.monthlyStorageGB,
      action: 'Delete unused evidence or upgrade plan'
    });
  }
  
  // Check family members
  if (plan.limits.maxFamilyMembers !== Infinity) {
    const memberPercent = (usage.familyMembersCount / plan.limits.maxFamilyMembers) * 100;
    if (memberPercent >= 90) {
      alerts.push({
        id: `alert_members_${Date.now()}`,
        type: memberPercent >= 100 ? 'hard_limit' : 'approaching_limit',
        resource: 'members',
        message: `You've reached ${memberPercent.toFixed(1)}% of your member limit`,
        percentageUsed: memberPercent,
        currentUsage: usage.familyMembersCount,
        limit: plan.limits.maxFamilyMembers,
        action: 'Upgrade to Pro or Enterprise'
      });
    }
  }
  
  res.json({ alerts, count: alerts.length });
});

/**
 * PUT /api/billing/alerts/:alertId/acknowledge
 * Mark alert as acknowledged
 */
router.put('/api/billing/alerts/:alertId/acknowledge', (req, res) => {
  const { alertId } = req.params;
  
  // TODO: Update alert in database
  res.json({ message: 'Alert acknowledged' });
});

export default router;
