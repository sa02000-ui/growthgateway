import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

// ============================================================
// AI Receptionist module — isolated from the assessment product.
// Tables are prefixed receptionist_ so the module can be lifted
// into its own repo/database later without collisions.
// ============================================================

export const receptionistTenants = pgTable("receptionist_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").notNull(),
  status: varchar("status").notNull().default("draft"), // draft | provisioning | active | paused | error
  businessName: text("business_name").notNull(),
  niche: varchar("niche").notNull(),
  website: text("website"),
  businessPhone: varchar("business_phone"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  // Legal / A2P 10DLC registration inputs
  legalName: text("legal_name"),
  ein: varchar("ein"),
  address: jsonb("address"), // { street, city, state, zip }
  // Branding
  logoUrl: text("logo_url"),
  customDomain: text("custom_domain"),
  // Operations
  timezone: varchar("timezone").notNull().default("America/New_York"),
  businessHours: jsonb("business_hours"), // { mon: {open, close}, ... }
  services: jsonb("services"), // [{ name, price, durationMin, description }]
  faqs: jsonb("faqs"), // [{ question, answer }]
  greeting: text("greeting"),
  escalation: jsonb("escalation"), // { transferNumber, rules: string[] }
  // Provisioned resources
  ghlLocationId: varchar("ghl_location_id"),
  retellLlmId: varchar("retell_llm_id"),
  retellAgentId: varchar("retell_agent_id"),
  retellPhoneNumber: varchar("retell_phone_number"),
  provisioning: jsonb("provisioning"), // per-step log: { stepName: { status, detail, at } }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const receptionistCalls = pgTable("receptionist_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  retellCallId: varchar("retell_call_id").unique(),
  direction: varchar("direction").notNull().default("inbound"),
  fromNumber: varchar("from_number"),
  toNumber: varchar("to_number"),
  startedAt: timestamp("started_at"),
  durationSec: integer("duration_sec"),
  transcript: text("transcript"),
  recordingUrl: text("recording_url"),
  disconnectionReason: varchar("disconnection_reason"),
  // LLM-as-judge audit results
  outcome: varchar("outcome"), // booked | answered | escalated | missed | voicemail | unknown
  sentiment: varchar("sentiment"), // positive | neutral | negative
  score: jsonb("score"), // full judge output
  escalated: boolean("escalated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const receptionistSuggestions = pgTable("receptionist_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  sourceCallId: varchar("source_call_id"),
  type: varchar("type").notNull(), // faq_gap | settings | escalation | knowledge
  title: text("title").notNull(),
  detail: text("detail"),
  proposedFaq: jsonb("proposed_faq"), // { question, answer } when type = faq_gap
  status: varchar("status").notNull().default("proposed"), // proposed | approved | dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReceptionistTenant = typeof receptionistTenants.$inferSelect;
export type ReceptionistCall = typeof receptionistCalls.$inferSelect;
export type ReceptionistSuggestion = typeof receptionistSuggestions.$inferSelect;

// ============================================================
// Onboarding form — the client-facing "fill this out and go live"
// contract. Every field maps to an automated provisioning step.
// ============================================================

export const NICHES = [
  "home_services",
  "salon",
  "chiropractic",
  "medical",
  "dental",
  "restaurant",
  "multifamily_leasing",
  "general",
] as const;

export const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/), // "09:00"
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().optional(),
});

export const onboardingFormSchema = z.object({
  businessName: z.string().min(2).max(120),
  niche: z.enum(NICHES),
  website: z.string().url().optional().or(z.literal("")),
  businessPhone: z.string().min(7).max(20).optional().or(z.literal("")),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  legalName: z.string().max(200).optional().or(z.literal("")),
  ein: z
    .string()
    .regex(/^\d{2}-?\d{7}$/, "EIN must look like 12-3456789")
    .optional()
    .or(z.literal("")),
  address: z
    .object({
      street: z.string().max(200),
      city: z.string().max(100),
      state: z.string().max(50),
      zip: z.string().max(15),
    })
    .optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  customDomain: z.string().max(200).optional().or(z.literal("")),
  timezone: z.string().default("America/New_York"),
  businessHours: z
    .record(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), dayHoursSchema)
    .optional(),
  services: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        price: z.string().max(60).optional().or(z.literal("")),
        durationMin: z.number().int().positive().optional(),
        description: z.string().max(500).optional().or(z.literal("")),
      }),
    )
    .default([]),
  faqs: z
    .array(
      z.object({
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(2000),
      }),
    )
    .default([]),
  greeting: z.string().max(500).optional().or(z.literal("")),
  escalation: z
    .object({
      transferNumber: z.string().max(20).optional().or(z.literal("")),
      rules: z.array(z.string().max(300)).default([]),
    })
    .default({ rules: [] }),
});

export type OnboardingForm = z.infer<typeof onboardingFormSchema>;

// Settings a live tenant may tweak from the dashboard (subset of the form).
export const tenantSettingsSchema = onboardingFormSchema
  .pick({
    greeting: true,
    businessHours: true,
    services: true,
    faqs: true,
    escalation: true,
    timezone: true,
  })
  .partial();

export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const NICHE_LABELS: Record<(typeof NICHES)[number], string> = {
  home_services: "Home Services (HVAC, plumbing, electrical...)",
  salon: "Salon / Spa",
  chiropractic: "Chiropractic",
  medical: "Medical Office",
  dental: "Dental Office",
  restaurant: "Restaurant",
  multifamily_leasing: "Multifamily / Apartment Leasing",
  general: "Other / General",
};
