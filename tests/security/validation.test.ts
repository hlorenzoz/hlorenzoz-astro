import { describe, it, expect } from 'vitest';
import {
  validate,
  contactFormSchema,
  emailSchema,
  passwordSchema,
} from '@/lib/security/validation';

describe('Validation - Email Schema', () => {
  it('validates and transforms email', () => {
    const result = validate(emailSchema, 'test@example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('rejects invalid emails', () => {
    const result = validate(emailSchema, 'not-an-email');
    expect(result.success).toBe(false);
  });
});

describe('Validation - Contact Form Schema', () => {
  const validFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, I need help with a new website.',
    website: '', // Honeypot
  };

  it('validates correct form data', () => {
    const result = validate(contactFormSchema, validFormData);
    expect(result.success).toBe(true);
  });

  it('rejects form with short name', () => {
    const result = validate(contactFormSchema, {
      ...validFormData,
      name: 'J',
    });
    expect(result.success).toBe(false);
  });

  it('rejects form with invalid email', () => {
    const result = validate(contactFormSchema, {
      ...validFormData,
      email: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects form with short message', () => {
    const result = validate(contactFormSchema, {
      ...validFormData,
      message: 'Hi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects form with filled honeypot', () => {
    const result = validate(contactFormSchema, {
      ...validFormData,
      website: 'http://spam.com',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional company field', () => {
    const result = validate(contactFormSchema, {
      ...validFormData,
      company: 'Acme Corp',
    });
    expect(result.success).toBe(true);
  });
});

describe('Validation - Password Schema', () => {
  it('validates strong password', () => {
    const result = validate(passwordSchema, 'MyP@ssw0rd123!');
    expect(result.success).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(validate(passwordSchema, 'weak').success).toBe(false);
    expect(validate(passwordSchema, 'nouppercase1!').success).toBe(false);
    expect(validate(passwordSchema, 'NOLOWERCASE1!').success).toBe(false);
    expect(validate(passwordSchema, 'NoNumbers!').success).toBe(false);
    expect(validate(passwordSchema, 'NoSpecial123').success).toBe(false);
  });
});
