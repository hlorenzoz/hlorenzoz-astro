import { z } from 'zod';

/**
 * Validation Schemas using Zod
 * Provides runtime type checking and validation
 */

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .min(5, 'Email too short')
  .max(320, 'Email too long')
  .transform((email) => email.toLowerCase());

// Contact form schema
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),

  email: emailSchema,

  company: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name too long')
    .optional(),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),

  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long'),

  // Honeypot field - should always be empty
  website: z.string().max(0, 'Invalid submission').optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Fleet size schema
export const fleetSizeSchema = z
  .number()
  .int('Fleet size must be a whole number')
  .min(1, 'Fleet size must be at least 1')
  .max(100000, 'Fleet size too large');

// URL validation schema
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://');

// Password schema for future auth
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Search query validation
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(200, 'Search query too long')
  .transform((query) => query.trim());

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Generic ID validation
export const idSchema = z.string().uuid('Invalid ID format');

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  type: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ], {
    errorMap: () => ({ message: 'Invalid file type' }),
  }),
});

/**
 * Validate data against schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Validation failed'],
    };
  }
}
