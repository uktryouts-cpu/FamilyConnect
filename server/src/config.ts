/**
 * Environment Configuration & Validation
 * 
 * Validates that all required environment variables are set and correct
 * before the application starts.
 */

import { z } from 'zod';

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

const environmentSchema = z.object({
  // Required in all environments
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().min(1024).max(65535).default(5174),

  // Gemini API Configuration
  GEMINI_API_KEY: z.string().min(20, 'GEMINI_API_KEY must be at least 20 characters'),

  // Security Configuration
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .refine(
      (val) => /^[a-zA-Z0-9+/=]{32,}$/.test(val),
      'JWT_SECRET must be alphanumeric'
    ),
  TOKEN_EXPIRY: z.coerce.number().min(300).max(86400).default(3600), // 5 min - 24 hours

  // CORS & Origins
  ALLOWED_ORIGINS: z.string()
    .default('http://localhost:3000,http://localhost:5173,http://localhost:5174'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).default(100),

  // Data Encryption
  PII_HASH_SALT: z.string()
    .min(16, 'PII_HASH_SALT must be at least 16 characters')
    .default('dev-salt-change-in-production'),

  // Database (for future use)
  DATABASE_URL: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Stripe (for future billing integration)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email Service (for future notifications)
  SENDGRID_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),

  // Feature Flags
  ENABLE_BILLING: z.enum(['true', 'false']).default('false'),
  ENABLE_AUTHENTICATION: z.enum(['true', 'false']).default('false'),
});

// ============================================================================
// VALIDATION
// ============================================================================

export type Environment = z.infer<typeof environmentSchema>;

let validatedEnv: Environment | null = null;

/**
 * Validate and return environment variables
 * Throws if validation fails
 */
export function getEnvironment(): Environment {
  if (validatedEnv) return validatedEnv;

  try {
    validatedEnv = environmentSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:\n');
      error.errors.forEach(err => {
        const path = err.path.join('.');
        console.error(`  ${path}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validate environment on application startup
 */
export function validateEnvironment(): void {
  const env = getEnvironment();
  const nodeEnv = env.NODE_ENV;

  console.log(`\n✓ Environment: ${nodeEnv}`);
  console.log(`✓ Port: ${env.PORT}`);
  console.log(`✓ GEMINI_API_KEY: ${env.GEMINI_API_KEY.substring(0, 10)}...`);
  console.log(`✓ JWT_SECRET: ${env.JWT_SECRET.substring(0, 10)}...`);
  console.log(`✓ Allowed Origins: ${env.ALLOWED_ORIGINS}`);

  // Production-specific validations
  if (nodeEnv === 'production') {
    const errors: string[] = [];

    // Check for strong JWT secret (should not contain predictable patterns)
    if (env.JWT_SECRET.includes('dev') || env.JWT_SECRET.includes('test')) {
      errors.push('JWT_SECRET appears to use development pattern. Use a production-grade secret.');
    }

    // Check for database configuration
    if (!env.DATABASE_URL) {
      errors.push('DATABASE_URL not set. Database is required for production.');
    }

    // Check for Stripe configuration (if billing enabled)
    if (env.ENABLE_BILLING === 'true' && !env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY required when ENABLE_BILLING is true.');
    }

    if (errors.length > 0) {
      console.error('\n⚠️  Production environment issues:');
      errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log('✓ Production validations passed');
  }

  console.log('✓ All environment variables validated\n');
}

// ============================================================================
// SECURE DEFAULTS
// ============================================================================

/**
 * Get secure configuration object
 * Filters out sensitive values from being logged
 */
export function getSecureConfig(): Partial<Environment> {
  const env = getEnvironment();

  return {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    LOG_LEVEL: env.LOG_LEVEL,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    RATE_LIMIT_WINDOW_MS: env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: env.RATE_LIMIT_MAX_REQUESTS,
    ENABLE_BILLING: env.ENABLE_BILLING,
    ENABLE_AUTHENTICATION: env.ENABLE_AUTHENTICATION,
    // Do NOT include: GEMINI_API_KEY, JWT_SECRET, PII_HASH_SALT, etc.
  };
}
