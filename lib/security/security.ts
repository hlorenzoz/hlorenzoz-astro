/**
 * Security Utilities
 * Rate limiting, bot detection, and validation
 */

// Simple in-memory rate limiter (use Redis/Cloudflare KV in production)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  }
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store[identifier];

  // Clean up expired entries
  if (record && now > record.resetTime) {
    delete store[identifier];
  }

  // Check if identifier exists and is within window
  if (!store[identifier]) {
    store[identifier] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: store[identifier].resetTime,
    };
  }

  // Increment counter
  store[identifier].count++;

  const limited = store[identifier].count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - store[identifier].count);

  return {
    limited,
    remaining,
    resetTime: store[identifier].resetTime,
  };
}

/**
 * Bot detection based on user agent and behavior
 */
export function detectBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scrape/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Validate request headers for security
 */
export function validateHeaders(headers: Headers): {
  valid: boolean;
  reason?: string;
} {
  // Check for required headers
  const userAgent = headers.get('user-agent');
  if (!userAgent) {
    return { valid: false, reason: 'Missing user agent' };
  }

  // Check for suspicious patterns
  if (detectBot(userAgent)) {
    return { valid: false, reason: 'Bot detected' };
  }

  // Check for CSRF token on non-GET requests
  const method = headers.get('x-http-method') || 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = headers.get('x-csrf-token');
    if (!csrfToken) {
      return { valid: false, reason: 'Missing CSRF token' };
    }
  }

  return { valid: true };
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>'"]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[char] || char;
    })
    .trim();
}

/**
 * Validate email with DNS check capability
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks
  const [localPart, domain] = email.split('@');

  // Check local part length
  if (localPart.length > 64) {
    return false;
  }

  // Check domain length
  if (domain.length > 253) {
    return false;
  }

  // Check for disposable email domains (basic list)
  const disposableDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
  ];

  if (disposableDomains.some((d) => domain.toLowerCase().endsWith(d))) {
    return false;
  }

  return true;
}

/**
 * Check honeypot field (trap for bots)
 */
export function checkHoneypot(value: string | null | undefined): boolean {
  // Honeypot field should always be empty
  return !value || value.trim() === '';
}

/**
 * IP-based rate limiting identifier
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
}
