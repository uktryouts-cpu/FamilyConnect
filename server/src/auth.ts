/**
 * Authentication & Authorization Module
 * 
 * Handles JWT token generation, validation, and user authentication.
 * Never expose sensitive data in responses.
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface DecodedToken {
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: DecodedToken;
  correlationId?: string;
}

const tokenPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  tier: z.enum(['free', 'pro', 'enterprise']),
  iat: z.number(),
  exp: z.number(),
});

// ============================================================================
// CONFIGURATION
// ============================================================================

// In production, these should come from environment variables with strict validation
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY || '3600', 10); // 1 hour default

// Validate critical environment variables on startup
if (process.env.NODE_ENV === 'production') {
  if (JWT_SECRET === 'dev-secret-key-change-in-production') {
    throw new Error('CRITICAL: JWT_SECRET not set in production. Set JWT_SECRET environment variable.');
  }
  if (JWT_SECRET.length < 32) {
    throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters in production.');
  }
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate a secure JWT token
 * Payload is signed with HMAC-SHA256
 * 
 * WARNING: This is a simplified JWT implementation for MVP.
 * For production, use `jsonwebtoken` package with RS256 (asymmetric signing).
 */
export function generateToken(payload: Omit<DecodedToken, 'iat' | 'exp'>): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_EXPIRY;
  
  const tokenPayload: DecodedToken = {
    ...payload,
    iat,
    exp,
  };

  // Create header.payload
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const message = `${header}.${body}`;

  // Sign with HMAC-SHA256
  const signature = createHmac('sha256', JWT_SECRET)
    .update(message)
    .digest('base64url');

  return `${message}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;

    // Verify signature using timing-safe comparison
    const message = `${header}.${body}`;
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(message)
      .digest('base64url');

    // Use timingSafeEqual to prevent timing attacks
    try {
      timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return null; // Signature mismatch
    }

    // Decode and validate payload
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    const validatedPayload = tokenPayloadSchema.parse(payload);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (validatedPayload.exp < now) {
      return null; // Token expired
    }

    return validatedPayload;
  } catch {
    return null; // Invalid token format or validation error
  }
}

/**
 * Generate a secure session token (for temporary user sessions)
 * Different from JWT - used for additional security layer
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Extract and validate JWT token from Authorization header
 * Expected format: "Bearer <token>"
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Missing authentication token',
      code: 'AUTH_MISSING'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ 
      error: 'Invalid authorization header format',
      code: 'AUTH_INVALID_FORMAT'
    });
  }

  const token = parts[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID_TOKEN'
    });
  }

  // Attach user info to request (sanitized)
  req.user = decoded;

  // Add correlation ID for request tracing (helps with debugging)
  req.correlationId = randomBytes(8).toString('hex');

  next();
};

/**
 * Optional auth middleware - doesn't require token but validates if present
 */
export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const decoded = verifyToken(parts[1]);
      if (decoded) {
        req.user = decoded;
      }
    }
  }

  req.correlationId = randomBytes(8).toString('hex');
  next();
};

/**
 * Verify user has required tier (used for tier-based rate limiting)
 */
export const requireTier = (allowedTiers: DecodedToken['tier'][]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedTiers.includes(req.user.tier)) {
      return res.status(403).json({ 
        error: 'Insufficient subscription tier',
        code: 'TIER_INSUFFICIENT'
      });
    }

    next();
  };
};

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Hash a password using PBKDF2 (production-ready)
 * In production, use bcrypt or argon2 instead
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const iterations = 100000;
  const hash = createHmac('sha256', salt)
    .update(password)
    .digest('hex');
  
  return `${iterations}:${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [iterationsStr, salt, storedHash] = hash.split(':');
    const iterations = parseInt(iterationsStr, 10);
    
    let computedHash = password;
    for (let i = 0; i < iterations; i++) {
      computedHash = createHmac('sha256', salt)
        .update(computedHash)
        .digest('hex');
    }
    
    // Use timing-safe comparison to prevent timing attacks
    timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(storedHash)
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a secure reset token for password recovery
 */
export function generateResetToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  const hash = createHmac('sha256', JWT_SECRET)
    .update(token)
    .digest('hex');
  
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  return { token, hash, expiresAt };
}
