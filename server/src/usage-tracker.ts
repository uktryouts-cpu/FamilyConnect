/**
 * Usage Tracking Middleware
 * 
 * Tracks API token usage, storage, and requests per user
 * for billing and rate limiting purposes.
 */

import type { Request, Response, NextFunction } from 'express';

// In-memory usage store (replace with database in production)
interface UserUsageSession {
  userId: string;
  month: string;
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
  lastUpdated: Date;
}

const usageStore = new Map<string, UserUsageSession>();

/**
 * Track API token usage from Gemini responses
 * This middleware should be called after Gemini API calls
 */
export function trackTokenUsage(
  userId: string,
  tokens: number,
  callType: 'textGeneration' | 'imageGeneration' | 'videoAnalysis' | 'audioTranscription' | 'other'
) {
  const month = new Date().toISOString().substring(0, 7); // YYYY-MM
  const key = `${userId}-${month}`;
  
  if (!usageStore.has(key)) {
    usageStore.set(key, {
      userId,
      month,
      apiTokensUsed: 0,
      apiCallsCount: 0,
      storageUsedGB: 0,
      evidenceStorageGB: 0,
      familyMembersCount: 0,
      aiRequestsCount: 0,
      geminiCallsBreakdown: {
        textGeneration: 0,
        imageGeneration: 0,
        videoAnalysis: 0,
        audioTranscription: 0,
        other: 0
      },
      lastUpdated: new Date()
    });
  }
  
  const usage = usageStore.get(key)!;
  usage.apiTokensUsed += tokens;
  usage.apiCallsCount += 1;
  usage.geminiCallsBreakdown[callType] += tokens;
  usage.aiRequestsCount += 1;
  usage.lastUpdated = new Date();
}

/**
 * Get monthly usage for a user
 */
export function getMonthlyUsage(userId: string, month?: string) {
  const targetMonth = month || new Date().toISOString().substring(0, 7);
  const key = `${userId}-${targetMonth}`;
  return usageStore.get(key);
}

/**
 * Track storage usage when vault is saved
 */
export function trackStorageUsage(userId: string, sizeGB: number, type: 'family_data' | 'evidence') {
  const month = new Date().toISOString().substring(0, 7);
  const key = `${userId}-${month}`;
  
  if (!usageStore.has(key)) {
    usageStore.set(key, {
      userId,
      month,
      apiTokensUsed: 0,
      apiCallsCount: 0,
      storageUsedGB: 0,
      evidenceStorageGB: 0,
      familyMembersCount: 0,
      aiRequestsCount: 0,
      geminiCallsBreakdown: {
        textGeneration: 0,
        imageGeneration: 0,
        videoAnalysis: 0,
        audioTranscription: 0,
        other: 0
      },
      lastUpdated: new Date()
    });
  }
  
  const usage = usageStore.get(key)!;
  if (type === 'family_data') {
    usage.storageUsedGB = Math.max(usage.storageUsedGB, sizeGB);
  } else {
    usage.evidenceStorageGB = Math.max(usage.evidenceStorageGB, sizeGB);
  }
  usage.lastUpdated = new Date();
}

/**
 * Track family members count
 */
export function trackFamilyMembersCount(userId: string, count: number) {
  const month = new Date().toISOString().substring(0, 7);
  const key = `${userId}-${month}`;
  
  if (!usageStore.has(key)) {
    usageStore.set(key, {
      userId,
      month,
      apiTokensUsed: 0,
      apiCallsCount: 0,
      storageUsedGB: 0,
      evidenceStorageGB: 0,
      familyMembersCount: count,
      aiRequestsCount: 0,
      geminiCallsBreakdown: {
        textGeneration: 0,
        imageGeneration: 0,
        videoAnalysis: 0,
        audioTranscription: 0,
        other: 0
      },
      lastUpdated: new Date()
    });
  } else {
    const usage = usageStore.get(key)!;
    usage.familyMembersCount = count;
    usage.lastUpdated = new Date();
  }
}

/**
 * Reset usage for testing
 */
export function resetUsageForMonth(userId: string, month: string) {
  const key = `${userId}-${month}`;
  usageStore.delete(key);
}

/**
 * Get all usage for a user (all months)
 */
export function getUserAllUsage(userId: string) {
  const userUsage: Record<string, any> = {};
  
  usageStore.forEach((usage, key) => {
    const [id] = key.split('-');
    if (id === userId) {
      userUsage[usage.month] = usage;
    }
  });
  
  return userUsage;
}

/**
 * Clear expired usage data (older than 12 months)
 */
export function cleanupExpiredUsage() {
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  usageStore.forEach((usage, key) => {
    if (usage.lastUpdated < cutoffDate) {
      usageStore.delete(key);
    }
  });
}

// Schedule cleanup: run monthly
setInterval(cleanupExpiredUsage, 30 * 24 * 60 * 60 * 1000); // Every 30 days
