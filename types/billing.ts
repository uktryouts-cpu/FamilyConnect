/**
 * Billing Types & Schemas
 * 
 * Defines subscription tiers, usage tracking, and invoice structures
 * for FamilyConnect API usage billing.
 */

import { z } from 'zod';

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const SubscriptionTier = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
} as const;

export type SubscriptionTierType = typeof SubscriptionTier[keyof typeof SubscriptionTier];

export interface SubscriptionPlan {
  tier: SubscriptionTierType;
  name: string;
  monthlyPrice: number;          // in USD
  description: string;
  features: string[];
  limits: {
    monthlyApiTokens: number;    // 1M tokens = ~1,000 API calls
    monthlyStorageGB: number;    // Family data storage
    maxFamilyMembers: number;    // Per vault
    maxConcurrentUsers: number;  // Family members with access
    aiRequestsPerDay: number;    // For rate limiting
    evidenceStorageGB: number;   // Photos, documents, etc.
  };
  billing: {
    interval: 'monthly' | 'annual';
    autoRenew: boolean;
    gracePeriodDays: number;     // Days after limit before soft limit
  };
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTierType, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    monthlyPrice: 0,
    description: 'Perfect for getting started with family research',
    features: [
      'Up to 100 family members',
      '50,000 monthly AI tokens',
      '1 GB secure storage',
      'Basic family tree view',
      'Email support (48h response)',
      'Community access'
    ],
    limits: {
      monthlyApiTokens: 50_000,     // ~50 API calls
      monthlyStorageGB: 1,
      maxFamilyMembers: 100,
      maxConcurrentUsers: 1,
      aiRequestsPerDay: 5,
      evidenceStorageGB: 0.5
    },
    billing: {
      interval: 'monthly',
      autoRenew: true,
      gracePeriodDays: 3
    }
  },

  pro: {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    description: 'For serious genealogists and family historians',
    features: [
      'Up to 2,000 family members',
      '5 million monthly AI tokens',
      '10 GB secure storage',
      'Advanced family tree analysis',
      'DNA matching integration',
      'Timeline visualization',
      'Geographic distribution',
      'Evidence vault',
      'Priority support (24h response)',
      'Monthly insights report',
      'Share trees with up to 5 family members'
    ],
    limits: {
      monthlyApiTokens: 5_000_000,  // ~5,000 API calls
      monthlyStorageGB: 10,
      maxFamilyMembers: 2_000,
      maxConcurrentUsers: 5,
      aiRequestsPerDay: 100,
      evidenceStorageGB: 5
    },
    billing: {
      interval: 'monthly',
      autoRenew: true,
      gracePeriodDays: 7
    }
  },

  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 49.99,
    description: 'For research institutions, genealogists, and large families',
    features: [
      'Unlimited family members',
      '50 million monthly AI tokens',
      'Unlimited secure storage',
      'All Pro features',
      'Autonomous AI agent research',
      'Advanced analytics & insights',
      'Bulk import (GEDCOM, CSV, DNA)',
      'API access for integrations',
      'Dedicated support (4h response)',
      'Data export (all formats)',
      'Unlimited tree sharing',
      'Custom branding for family portal',
      'Backup & disaster recovery',
      'HIPAA compliance (on request)',
      'Annual review with research advisor'
    ],
    limits: {
      monthlyApiTokens: 50_000_000,  // ~50,000 API calls
      monthlyStorageGB: 1_000,        // 1TB
      maxFamilyMembers: Infinity,
      maxConcurrentUsers: Infinity,
      aiRequestsPerDay: 1_000,
      evidenceStorageGB: 500          // 500GB
    },
    billing: {
      interval: 'annual',             // Billed annually
      autoRenew: true,
      gracePeriodDays: 30
    }
  }
};

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface MonthlyUsage {
  userId: string;
  month: string;                     // YYYY-MM
  apiTokensUsed: number;
  apiCallsCount: number;
  storageUsedGB: number;
  evidenceStorageGB: number;
  familyMembersCount: number;
  aiRequestsCount: number;
  geminiCallsBreakdown: {
    textGeneration: number;
    imageGeneration: number;
    videoAnalysis: number;
    audioTranscription: number;
    other: number;
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTierType;
  status: 'active' | 'past_due' | 'canceled' | 'suspended';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  stripeSubscriptionId?: string;    // For Stripe integration
  paymentMethod?: {
    type: 'card' | 'bank_transfer' | 'manual';
    last4?: string;
    expiresAt?: Date;
  };
  billingEmail: string;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageAlert {
  id: string;
  userId: string;
  type: 'soft_limit' | 'hard_limit' | 'approaching_limit';
  resource: 'api_tokens' | 'storage' | 'requests_per_day' | 'members';
  percentageUsed: number;
  currentUsage: number;
  limit: number;
  sentAt: Date;
  acknowledgedAt?: Date;
}

// ============================================================================
// INVOICING
// ============================================================================

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;                    // In USD cents (e.g., 999 = $9.99)
  currency: 'USD' | 'EUR' | 'GBP';
  status: 'draft' | 'sent' | 'paid' | 'failed' | 'refunded';
  period: {
    start: Date;
    end: Date;
  };
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  taxRate: number;                   // 0.0 - 1.0 (e.g., 0.10 = 10%)
  total: number;
  dueDate: Date;
  paidDate?: Date;
  stripeInvoiceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  userId: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  method: 'card' | 'bank_transfer' | 'manual';
  transactionId: string;
  stripePaymentId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// VALIDATION SCHEMAS (Zod)
// ============================================================================

export const upgradeSubscriptionSchema = z.object({
  tier: z.enum(['free', 'pro', 'enterprise']),
  billingEmail: z.string().email(),
  autoRenew: z.boolean().default(true),
  paymentMethodId: z.string().optional() // For Stripe integration
});

export const usageAlertSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['soft_limit', 'hard_limit', 'approaching_limit']),
  resource: z.enum(['api_tokens', 'storage', 'requests_per_day', 'members']),
  percentageUsed: z.number().min(0).max(100),
  currentUsage: z.number(),
  limit: z.number()
});

export const invoiceSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  status: z.enum(['draft', 'sent', 'paid', 'failed', 'refunded']),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative()
  })),
  taxRate: z.number().min(0).max(1)
});

// ============================================================================
// PRICING CALCULATOR
// ============================================================================

/**
 * Calculate monthly cost based on overage usage (for enterprise customers)
 * 
 * Free & Pro: Fixed cost
 * Enterprise: Base cost + overage charges for tokens/storage beyond limits
 */
export function calculateMonthlyCharge(
  tier: SubscriptionTierType,
  usage: MonthlyUsage,
  overageRates = {
    perMillionTokens: 5,           // $5 per 1M tokens
    perGB: 0.99                    // $0.99 per GB
  }
): number {
  const plan = SUBSCRIPTION_PLANS[tier];
  
  // Free and Pro: Fixed pricing
  if (tier === 'free' || tier === 'pro') {
    return plan.monthlyPrice;
  }
  
  // Enterprise: Base + overage
  let charge = plan.monthlyPrice;
  
  // Overage on API tokens
  if (usage.apiTokensUsed > plan.limits.monthlyApiTokens) {
    const overageTokens = usage.apiTokensUsed - plan.limits.monthlyApiTokens;
    const overageCost = (overageTokens / 1_000_000) * overageRates.perMillionTokens;
    charge += overageCost;
  }
  
  // Overage on storage
  if (usage.storageUsedGB > plan.limits.monthlyStorageGB) {
    const overageStorage = usage.storageUsedGB - plan.limits.monthlyStorageGB;
    const overageCost = overageStorage * overageRates.perGB;
    charge += overageCost;
  }
  
  return charge;
}

/**
 * Check if user has exceeded hard limits
 */
export function checkHardLimits(
  tier: SubscriptionTierType,
  usage: MonthlyUsage
): { exceeded: boolean; violatedLimits: string[] } {
  const plan = SUBSCRIPTION_PLANS[tier];
  const violated: string[] = [];
  
  if (usage.apiTokensUsed > plan.limits.monthlyApiTokens) {
    violated.push(`API tokens (${usage.apiTokensUsed} / ${plan.limits.monthlyApiTokens})`);
  }
  
  if (usage.storageUsedGB > plan.limits.monthlyStorageGB) {
    violated.push(`Storage (${usage.storageUsedGB.toFixed(2)}GB / ${plan.limits.monthlyStorageGB}GB)`);
  }
  
  if (usage.familyMembersCount > plan.limits.maxFamilyMembers) {
    violated.push(`Family members (${usage.familyMembersCount} / ${plan.limits.maxFamilyMembers})`);
  }
  
  return {
    exceeded: violated.length > 0,
    violatedLimits: violated
  };
}

/**
 * Get usage percentage for a resource
 */
export function getUsagePercentage(
  tier: SubscriptionTierType,
  resource: keyof MonthlyUsage,
  usage: MonthlyUsage
): number {
  const plan = SUBSCRIPTION_PLANS[tier];
  
  const limitMap: Record<string, number | undefined> = {
    'apiTokensUsed': plan.limits.monthlyApiTokens,
    'storageUsedGB': plan.limits.monthlyStorageGB,
    'familyMembersCount': plan.limits.maxFamilyMembers,
    'aiRequestsCount': plan.limits.aiRequestsPerDay * 30 // Monthly estimate
  };
  
  const limit = limitMap[resource];
  if (!limit || limit === Infinity) return 0;
  
  return (usage[resource] as number / limit) * 100;
}
