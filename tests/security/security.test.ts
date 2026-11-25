import { describe, it, expect } from 'vitest';
import {
  checkRateLimit,
  detectBot,
  validateEmail,
  sanitizeInput,
  checkHoneypot,
} from '@/lib/security/security';

describe('Security - Rate Limiting', () => {
  it('allows requests within limit', () => {
    const result = checkRateLimit('test-user-1', {
      maxRequests: 10,
      windowMs: 60000,
    });

    expect(result.limited).toBe(false);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('blocks requests exceeding limit', () => {
    const config = { maxRequests: 2, windowMs: 60000 };
    const identifier = 'test-user-2';

    // Make requests up to limit
    checkRateLimit(identifier, config);
    checkRateLimit(identifier, config);

    // This should be rate limited
    const result = checkRateLimit(identifier, config);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

describe('Security - Bot Detection', () => {
  it('detects common bots', () => {
    expect(detectBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(detectBot('curl/7.64.1')).toBe(true);
    expect(detectBot('python-requests/2.25.1')).toBe(true);
  });

  it('allows normal browsers', () => {
    const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    expect(detectBot(chromeUA)).toBe(false);
  });
});

describe('Security - Email Validation', () => {
  it('validates correct emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  it('blocks disposable email domains', () => {
    expect(validateEmail('test@tempmail.com')).toBe(false);
    expect(validateEmail('user@10minutemail.com')).toBe(false);
  });
});

describe('Security - Input Sanitization', () => {
  it('sanitizes HTML special characters', () => {
    expect(sanitizeInput('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('preserves safe content', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  spaced  ')).toBe('spaced');
  });
});

describe('Security - Honeypot', () => {
  it('passes when honeypot is empty', () => {
    expect(checkHoneypot('')).toBe(true);
    expect(checkHoneypot(null)).toBe(true);
    expect(checkHoneypot(undefined)).toBe(true);
  });

  it('fails when honeypot has value', () => {
    expect(checkHoneypot('bot-filled-this')).toBe(false);
    expect(checkHoneypot('http://spam.com')).toBe(false);
  });
});
