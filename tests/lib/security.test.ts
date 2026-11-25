import { describe, it, expect, vi } from 'vitest';
import {
  checkRateLimit,
  detectBot,
  validateHeaders,
  generateCSRFToken,
  sanitizeInput,
  validateEmail,
  checkHoneypot,
  getClientIdentifier
} from '../../lib/security/security';
import {
  emailSchema,
  contactFormSchema,
  idSchema,
  validate as validateSchema
} from '../../lib/security/validation';

describe('Security Utilities', () => {
  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkRateLimit('user1', { maxRequests: 2, windowMs: 1000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(1);
    });

    it('should limit requests exceeding limit', () => {
      checkRateLimit('user2', { maxRequests: 1, windowMs: 1000 });
      const result = checkRateLimit('user2', { maxRequests: 1, windowMs: 1000 });
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      vi.useFakeTimers();
      checkRateLimit('user3', { maxRequests: 1, windowMs: 100 });
      vi.advanceTimersByTime(150);
      const result = checkRateLimit('user3', { maxRequests: 1, windowMs: 100 });
      expect(result.limited).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('detectBot', () => {
    it('should detect bots from user agent', () => {
      expect(detectBot('Googlebot/2.1')).toBe(true);
      expect(detectBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
      expect(detectBot('curl/7.64.1')).toBe(true);
    });

    it('should not detect normal users as bots', () => {
      expect(detectBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
    });
  });

  describe('validateHeaders', () => {
    it('should fail if user-agent is missing', () => {
      const headers = new Headers();
      const result = validateHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing user agent');
    });

    it('should fail if bot is detected', () => {
      const headers = new Headers();
      headers.set('user-agent', 'Googlebot');
      const result = validateHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Bot detected');
    });

    it('should fail if CSRF token is missing on POST', () => {
      const headers = new Headers();
      headers.set('user-agent', 'Mozilla/5.0');
      headers.set('x-http-method', 'POST');
      const result = validateHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing CSRF token');
    });

    it('should pass if headers are valid', () => {
      const headers = new Headers();
      headers.set('user-agent', 'Mozilla/5.0');
      headers.set('x-http-method', 'GET');
      const result = validateHeaders(headers);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate a 64-char hex string', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeInput('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeInput(' "alert" ')).toBe('&quot;alert&quot;');
    });
  });

  describe('validateEmail', () => {
    it('should identify valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@sub.domain.org')).toBe(true);
    });

    it('should identify invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('should reject disposable domains', () => {
      expect(validateEmail('user@mailinator.com')).toBe(false);
    });
  });

  describe('checkHoneypot', () => {
    it('should return true if empty', () => {
      expect(checkHoneypot('')).toBe(true);
      expect(checkHoneypot(null)).toBe(true);
    });
    it('should return false if filled', () => {
      expect(checkHoneypot('spam')).toBe(false);
    });
  });

  describe('getClientIdentifier', () => {
    it('should extract IP from headers', () => {
      const request = {
        headers: new Headers({ 'cf-connecting-ip': '1.2.3.4' })
      } as unknown as Request;
      expect(getClientIdentifier(request)).toBe('1.2.3.4');
    });
  });
});

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate and transform emails', () => {
      const result = emailSchema.parse(' TEST@Example.Com ');
      expect(result).toBe('test@example.com');
    });
  });

  describe('contactFormSchema', () => {
    it('should validate correct data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I am interested in your services.'
      };
      expect(contactFormSchema.parse(data)).toEqual(data);
    });

    it('should reject invalid characters in name', () => {
      const data = {
        name: 'John Doe <script>',
        email: 'john@example.com',
        message: 'Hello world'
      };
      expect(() => contactFormSchema.parse(data)).toThrow();
    });
  });

  describe('validate function', () => {
    it('should return success for valid data', () => {
      const result = validateSchema(idSchema, '550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('should return errors for invalid data', () => {
      const result = validateSchema(idSchema, 'invalid-id');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
