/**
 * Data Encryption & Protection Module
 * 
 * Handles AES-256 encryption for sensitive PII data (names, dates, locations).
 * Client-side encryption ensures data is encrypted before transmission.
 * 
 * WARNING: This uses crypto-js which is not ideal for production.
 * For production, use libsodium.js or tweetnacl.js for authenticated encryption.
 */

import crypto from 'crypto';
import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface EncryptedData {
  iv: string;           // Initialization Vector (hex-encoded)
  encryptedData: string; // AES-256-GCM encrypted data (hex-encoded)
  authTag: string;      // Authentication tag for GCM mode (hex-encoded)
  algorithm: 'aes-256-gcm';
}

// Validation schema for PII fields
export const piiSchema = z.object({
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-']+$/),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-']+$/),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  location: z.string().max(200),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/).optional(),
});

export type PII = z.infer<typeof piiSchema>;

// ============================================================================
// ENCRYPTION KEY MANAGEMENT
// ============================================================================

/**
 * Derive an encryption key from a master password using PBKDF2
 * Uses 100,000 iterations for strong key derivation
 */
export function deriveEncryptionKey(masterPassword: string, salt: Buffer = crypto.randomBytes(32)): { key: Buffer; salt: Buffer } {
  const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
  return { key, salt };
}

/**
 * Generate a random key for AES-256-GCM (32 bytes)
 */
export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Export key to format suitable for storage or transmission
 */
export function exportKey(key: Buffer): string {
  return key.toString('base64');
}

/**
 * Import key from storage format
 */
export function importKey(keyString: string): Buffer {
  return Buffer.from(keyString, 'base64');
}

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

/**
 * Encrypt data using AES-256-GCM
 * GCM mode provides both confidentiality and authenticity
 * 
 * @param data - Plain text to encrypt
 * @param key - 32-byte encryption key
 * @returns Encrypted data with IV and auth tag
 */
export function encryptData(data: string, key: Buffer): EncryptedData {
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (256 bits)');
  }

  const iv = crypto.randomBytes(12); // 96-bit IV (12 bytes) for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex'),
    algorithm: 'aes-256-gcm',
  };
}

/**
 * Decrypt data encrypted with encryptData()
 * 
 * @param encryptedData - Object containing IV, encrypted data, and auth tag
 * @param key - 32-byte encryption key (must be same as encryption key)
 * @returns Plain text
 */
export function decryptData(encryptedData: EncryptedData, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (256 bits)');
  }

  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed. Data may be corrupted or tampered with.');
  }
}

// ============================================================================
// PII PROTECTION UTILITIES
// ============================================================================

/**
 * Validate and sanitize PII before storage
 */
export function validateAndSanitizePII(data: unknown): PII {
  const validated = piiSchema.parse(data);
  
  // Additional sanitization
  return {
    firstName: validated.firstName.trim(),
    lastName: validated.lastName.trim(),
    birthDate: validated.birthDate,
    location: validated.location.trim(),
    email: validated.email?.toLowerCase().trim(),
    phone: validated.phone?.replace(/\s/g, ''),
  };
}

/**
 * Create a hash for PII (for duplicate detection without revealing data)
 * Uses SHA-256 with salt
 */
export function hashPII(firstName: string, lastName: string, birthDate: string): string {
  const salt = process.env.PII_HASH_SALT || 'default-salt-change-in-production';
  const combined = `${firstName.toLowerCase().trim()}|${lastName.toLowerCase().trim()}|${birthDate}|${salt}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Redact sensitive PII for logging (prevents accidental exposure in logs)
 */
export function redactPII(data: PII): Record<string, unknown> {
  return {
    firstName: `${data.firstName[0]}***`,
    lastName: `${data.lastName[0]}***`,
    birthDate: `****-**-${data.birthDate.slice(-2)}`,
    location: data.location.split(',').map((part, i) => i === 0 ? part : '***').join(','),
    hasEmail: !!data.email,
    hasPhone: !!data.phone,
  };
}

/**
 * Create a fingerprint for audit logging (identifies records without exposing data)
 */
export function createAuditFingerprint(data: PII): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
    }))
    .digest('hex')
    .slice(0, 8);
}

// ============================================================================
// SECURE DATA STRUCTURES
// ============================================================================

/**
 * Store encrypted PII with metadata
 */
export interface EncryptedPIIRecord {
  id: string;
  encryptedData: EncryptedData;
  dataHash: string;           // For duplicate detection
  auditFingerprint: string;   // For logging without exposing data
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create an encrypted PII record
 */
export function createEncryptedPIIRecord(
  id: string,
  pii: PII,
  encryptionKey: Buffer
): EncryptedPIIRecord {
  const encryptedData = encryptData(JSON.stringify(pii), encryptionKey);
  const dataHash = hashPII(pii.firstName, pii.lastName, pii.birthDate);
  const auditFingerprint = createAuditFingerprint(pii);

  return {
    id,
    encryptedData,
    dataHash,
    auditFingerprint,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Decrypt and retrieve PII from encrypted record
 */
export function decryptPIIRecord(record: EncryptedPIIRecord, encryptionKey: Buffer): PII {
  const decrypted = decryptData(record.encryptedData, encryptionKey);
  return JSON.parse(decrypted);
}

// ============================================================================
// VAULT PROTECTION
// ============================================================================

/**
 * Generate a vault encryption key from user's master password
 * This key encrypts the entire family tree vault
 */
export function generateVaultKey(masterPassword: string): { keyString: string; salt: string } {
  const salt = crypto.randomBytes(32);
  const { key } = deriveEncryptionKey(masterPassword, salt);
  
  return {
    keyString: exportKey(key),
    salt: salt.toString('base64'),
  };
}

/**
 * Recreate vault key from password and stored salt
 */
export function recoverVaultKey(masterPassword: string, saltString: string): string {
  const salt = Buffer.from(saltString, 'base64');
  const { key } = deriveEncryptionKey(masterPassword, salt);
  return exportKey(key);
}
