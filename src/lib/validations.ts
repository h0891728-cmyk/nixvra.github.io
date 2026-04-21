/**
 * NIXVRA - Zod Validation Schemas
 * Shared form and API validation definitions.
 */

import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }).trim().toLowerCase(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
})

export const CreateTenantSchema = z.object({
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be 63 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .trim(),
  name: z.string().min(2, 'Name required').max(255).trim(),
  industry: z.enum([
    'EDUCATION', 'HEALTHCARE', 'REAL_ESTATE', 'AGENCY',
    'ECOMMERCE', 'HOSPITALITY', 'LEGAL', 'FINANCE', 'OTHER',
  ]),
  modules: z.array(z.string()).min(1, 'Select at least one module'),
})

export const CreateUserSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[a-zA-Z]/, 'Must contain a letter')
    .regex(/[0-9]/, 'Must contain a number'),
  displayName: z.string().min(2).max(255).trim().optional(),
  role: z.enum(['TENANT_ADMIN', 'STAFF', 'CUSTOMER']),
  tenantId: z.string().uuid(),
})

export const CreateBusinessEntitySchema = z.object({
  tenantId: z.string().uuid(),
  type: z.enum(['STUDENT', 'PATIENT', 'LEAD', 'AGENT', 'CLIENT', 'VENDOR', 'MEMBER']),
  name: z.string().min(2).max(255).trim(),
  contact: z.string().min(3).max(320).trim(),
  altContact: z.string().max(320).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).optional(),
})

export const CreateTransactionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  description: z.string().optional(),
  amount: z.number().positive(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  currency: z.string().length(3).default('INR'),
  paymentGateway: z.enum(['RAZORPAY', 'STRIPE', 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER']),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const ScheduleSocialPostSchema = z.object({
  tenantId: z.string().uuid(),
  platforms: z.array(z.enum(['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'LINKEDIN', 'TWITTER_X', 'WHATSAPP_STATUS'])).min(1),
  mediaUrl: z.string().url('Must be a valid URL'),
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime(),
  canvaDesignId: z.string().optional(),
})

// ─── Types ─────────────────────────────────────────────────────────────────────
export type LoginInput = z.infer<typeof LoginSchema>
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type CreateBusinessEntityInput = z.infer<typeof CreateBusinessEntitySchema>
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type ScheduleSocialPostInput = z.infer<typeof ScheduleSocialPostSchema>
