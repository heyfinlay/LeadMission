import { z } from "zod";

const uuidSchema = z.string().uuid();
const urlSchema = z.string().url();

export const honeypotSchema = z.string().max(0).optional();

export const companyCreateSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  websiteUrl: urlSchema.optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  stage: z.string().trim().max(64).optional(),
  priority: z.string().trim().max(64).optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  honeypot: honeypotSchema,
});

export const companyUpdateSchema = z.object({
  businessName: z.string().trim().min(2).max(160).optional(),
  websiteUrl: urlSchema.optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  stage: z.string().trim().max(64).optional(),
  priority: z.string().trim().max(64).optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  honeypot: honeypotSchema,
});

export const scrapeSchema = z.object({
  companyId: uuidSchema,
  url: urlSchema,
  honeypot: honeypotSchema,
});

export const auditPromptSchema = z.object({
  companyId: uuidSchema,
  honeypot: honeypotSchema,
});

export const auditGenerateSchema = z.object({
  companyId: uuidSchema,
  honeypot: honeypotSchema,
});

export const auditSaveSchema = z.object({
  companyId: uuidSchema,
  auditId: uuidSchema.optional(),
  modelResponse: z.string().trim().min(30),
  honeypot: honeypotSchema,
});

export const proposalGenerateSchema = z.object({
  companyId: uuidSchema,
  honeypot: honeypotSchema,
});

export const proposalSectionSchema = z.object({
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(10000),
});

export const proposalSaveSchema = z.object({
  companyId: uuidSchema,
  proposalId: uuidSchema.optional(),
  title: z.string().trim().min(2).max(220),
  status: z.string().trim().min(2).max(64).optional(),
  sections: z.array(proposalSectionSchema).min(1),
  honeypot: honeypotSchema,
});

export const portalUpdateSchema = z.object({
  companyId: uuidSchema,
  portalEnabled: z.boolean().optional(),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  honeypot: honeypotSchema,
});

export const taskCreateSchema = z.object({
  companyId: uuidSchema,
  title: z.string().trim().min(2).max(220),
  status: z.string().trim().max(64).optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  honeypot: honeypotSchema,
});

