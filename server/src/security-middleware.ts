/**
 * Enhanced Security Middleware
 * 
 * Comprehensive middleware for request validation, security headers,
 * error handling, and audit logging.
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityContext {
  correlationId: string;
  timestamp: Date;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Environment-specific security settings
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5174').split(',');

// ============================================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns 400 Bad Request if validation fails
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      (req as any).validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Validate request parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      (req as any).validatedParams = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid parameters',
          code: 'INVALID_PARAMS',
        });
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      (req as any).validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY',
        });
      }
      next(error);
    }
  };
};

// ============================================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================================

/**
 * Add strict security headers to all responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection (legacy, but still useful for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer policy for privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy / Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  // HSTS (only in production)
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
};

// ============================================================================
// REQUEST/RESPONSE LOGGING
// ============================================================================

/**
 * Attach security context to request and log details
 */
export const securityContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const context: SecurityContext = {
    correlationId: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    method: req.method,
    path: req.path,
    ip: req.ip || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };

  (req as any).securityContext = context;

  // Log non-sensitive request details
  const queryString = Object.keys(req.query).length > 0 ? `?${Object.keys(req.query).join('&')}` : '';
  console.log(
    `[${context.correlationId}] ${context.method} ${context.path}${queryString} from ${context.ip}`
  );

  next();
};

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Global error handler
 * Logs full error server-side, returns sanitized response to client
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const context = (req as any).securityContext as SecurityContext;
  const correlationId = context?.correlationId || 'unknown';

  // Log full error server-side (never expose to client in production)
  const errorDetails = {
    correlationId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    error: {
      message: err.message || 'Unknown error',
      stack: err.stack,
      code: err.code,
    },
  };

  console.error('[ERROR]', JSON.stringify(errorDetails, null, 2));

  // Return sanitized response to client
  const statusCode = err.statusCode || (err.status || 500);
  const clientMessage = NODE_ENV === 'production'
    ? 'An error occurred processing your request'
    : err.message;

  res.status(statusCode).json({
    error: clientMessage,
    code: err.code || 'INTERNAL_ERROR',
    correlationId, // Helps user reference error in support tickets
    ...(NODE_ENV !== 'production' && { details: err.message }),
  });
};

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * Enhanced CORS configuration
 * Whitelist specific origins and methods
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id'],
  exposedHeaders: ['X-Correlation-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// ============================================================================
// REQUEST SIZE LIMITS
// ============================================================================

/**
 * Middleware to set size limits on request bodies
 * Prevents DoS attacks via large payloads
 */
export const requestSizeLimits = {
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true },
  raw: { limit: '5mb' },
};

// ============================================================================
// SENSITIVE DATA DETECTION
// ============================================================================

/**
 * Detect and sanitize sensitive data from logs
 */
export function sanitizeForLogging(obj: any, depth = 0): any {
  if (depth > 5) return '[REDACTED - MAX DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'password', 'passwd', 'pwd',
    'token', 'jwt', 'bearer',
    'secret', 'api_key', 'apikey',
    'authorization', 'auth',
    'credit_card', 'cvv', 'ssn',
    'private_key', 'privatekey',
    'session_id', 'sessionid',
  ];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item, depth + 1));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeForLogging(obj[key], depth + 1);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

// ============================================================================
// REQUEST FILTERING
// ============================================================================

/**
 * Block requests with suspicious patterns
 */
export const suspiciousRequestFilter = (req: Request, res: Response, next: NextFunction) => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /(\.\.|\/\/|\\)/,      // Path traversal
    /<script|javascript:/i, // XSS attempts
    /union.*select/i,       // SQL injection
    /drop.*table/i,         // SQL injection
    /exec\(/i,              // Code injection
  ];

  const pathAndQuery = `${req.path}?${Object.keys(req.query).join('&')}`;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(pathAndQuery));

  if (isSuspicious) {
    console.warn(`[SECURITY] Suspicious request from ${req.ip}: ${pathAndQuery}`);
    return res.status(400).json({
      error: 'Invalid request',
      code: 'INVALID_REQUEST',
    });
  }

  next();
};
