import { supabase } from "../db";
import type { OnboardingForm, TenantSettings } from "@shared/receptionist-schema";

// Supabase data access for the receptionist module. All reads/writes are
// scoped by owner_user_id or tenant_id — never expose cross-tenant data.

export interface TenantRow {
  id: string;
  owner_user_id: string;
  status: string;
  business_name: string;
  niche: string;
  website: string | null;
  business_phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  legal_name: string | null;
  ein: string | null;
  address: OnboardingForm["address"] | null;
  logo_url: string | null;
  custom_domain: string | null;
  timezone: string;
  business_hours: OnboardingForm["businessHours"] | null;
  services: OnboardingForm["services"] | null;
  faqs: OnboardingForm["faqs"] | null;
  greeting: string | null;
  escalation: OnboardingForm["escalation"] | null;
  ghl_location_id: string | null;
  retell_llm_id: string | null;
  retell_agent_id: string | null;
  retell_phone_number: string | null;
  provisioning: Record<string, ProvisionStep> | null;
  created_at: string;
  updated_at: string;
}

export interface ProvisionStep {
  status: "pending" | "done" | "simulated" | "error" | "manual";
  detail?: string;
  at: string;
}

export async function getTenantByOwner(ownerUserId: string): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from("receptionist_tenants")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getTenantByOwner: ${error.message}`);
  return data as TenantRow | null;
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const { data, error } = await supabase.from("receptionist_tenants").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getTenantById: ${error.message}`);
  return data as TenantRow | null;
}

export async function getTenantByAgentId(agentId: string): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from("receptionist_tenants")
    .select("*")
    .eq("retell_agent_id", agentId)
    .maybeSingle();
  if (error) throw new Error(`getTenantByAgentId: ${error.message}`);
  return data as TenantRow | null;
}

export async function createTenant(ownerUserId: string, form: OnboardingForm): Promise<TenantRow> {
  const { data, error } = await supabase
    .from("receptionist_tenants")
    .insert({
      owner_user_id: ownerUserId,
      status: "draft",
      business_name: form.businessName,
      niche: form.niche,
      website: form.website || null,
      business_phone: form.businessPhone || null,
      contact_name: form.contactName,
      contact_email: form.contactEmail,
      legal_name: form.legalName || null,
      ein: form.ein || null,
      address: form.address ?? null,
      logo_url: form.logoUrl || null,
      custom_domain: form.customDomain || null,
      timezone: form.timezone,
      business_hours: form.businessHours ?? null,
      services: form.services ?? [],
      faqs: form.faqs ?? [],
      greeting: form.greeting || null,
      escalation: form.escalation ?? { rules: [] },
      provisioning: {},
    })
    .select()
    .single();
  if (error) throw new Error(`createTenant: ${error.message}`);
  return data as TenantRow;
}

export async function updateTenant(id: string, patch: Record<string, unknown>): Promise<TenantRow> {
  const { data, error } = await supabase
    .from("receptionist_tenants")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateTenant: ${error.message}`);
  return data as TenantRow;
}

export async function applySettings(tenant: TenantRow, settings: TenantSettings): Promise<TenantRow> {
  const patch: Record<string, unknown> = {};
  if (settings.greeting !== undefined) patch.greeting = settings.greeting || null;
  if (settings.timezone !== undefined) patch.timezone = settings.timezone;
  if (settings.businessHours !== undefined) patch.business_hours = settings.businessHours;
  if (settings.services !== undefined) patch.services = settings.services;
  if (settings.faqs !== undefined) patch.faqs = settings.faqs;
  if (settings.escalation !== undefined) patch.escalation = settings.escalation;
  return updateTenant(tenant.id, patch);
}

/** Rebuild the OnboardingForm view of a stored tenant (for prompt regeneration). */
export function tenantToForm(t: TenantRow): OnboardingForm {
  return {
    businessName: t.business_name,
    niche: t.niche as OnboardingForm["niche"],
    website: t.website ?? "",
    businessPhone: t.business_phone ?? "",
    contactName: t.contact_name ?? "",
    contactEmail: t.contact_email ?? "",
    legalName: t.legal_name ?? "",
    ein: t.ein ?? "",
    address: t.address ?? undefined,
    logoUrl: t.logo_url ?? "",
    customDomain: t.custom_domain ?? "",
    timezone: t.timezone,
    businessHours: t.business_hours ?? undefined,
    services: t.services ?? [],
    faqs: t.faqs ?? [],
    greeting: t.greeting ?? "",
    escalation: t.escalation ?? { rules: [] },
  };
}

// ---- Calls ----

export interface CallRow {
  id: string;
  tenant_id: string;
  retell_call_id: string | null;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  started_at: string | null;
  duration_sec: number | null;
  transcript: string | null;
  recording_url: string | null;
  disconnection_reason: string | null;
  outcome: string | null;
  sentiment: string | null;
  score: Record<string, unknown> | null;
  escalated: boolean | null;
  created_at: string;
}

export async function upsertCall(row: Omit<Partial<CallRow>, "id"> & { tenant_id: string }): Promise<CallRow> {
  const { data, error } = await supabase
    .from("receptionist_calls")
    .upsert(row, { onConflict: "retell_call_id" })
    .select()
    .single();
  if (error) throw new Error(`upsertCall: ${error.message}`);
  return data as CallRow;
}

export async function updateCall(id: string, patch: Partial<CallRow>): Promise<void> {
  const { error } = await supabase.from("receptionist_calls").update(patch).eq("id", id);
  if (error) throw new Error(`updateCall: ${error.message}`);
}

export async function listCalls(tenantId: string, limit = 50, offset = 0): Promise<CallRow[]> {
  const { data, error } = await supabase
    .from("receptionist_calls")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`listCalls: ${error.message}`);
  return (data ?? []) as CallRow[];
}

// ---- Suggestions ----

export interface SuggestionRow {
  id: string;
  tenant_id: string;
  source_call_id: string | null;
  type: string;
  title: string;
  detail: string | null;
  proposed_faq: { question: string; answer: string } | null;
  status: string;
  created_at: string;
}

export async function createSuggestion(row: Omit<Partial<SuggestionRow>, "id"> & { tenant_id: string; type: string; title: string }): Promise<void> {
  const { error } = await supabase.from("receptionist_suggestions").insert(row);
  if (error) throw new Error(`createSuggestion: ${error.message}`);
}

export async function listSuggestions(tenantId: string, status?: string): Promise<SuggestionRow[]> {
  let q = supabase
    .from("receptionist_suggestions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(`listSuggestions: ${error.message}`);
  return (data ?? []) as SuggestionRow[];
}

export async function setSuggestionStatus(id: string, tenantId: string, status: "approved" | "dismissed"): Promise<SuggestionRow | null> {
  const { data, error } = await supabase
    .from("receptionist_suggestions")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();
  if (error) throw new Error(`setSuggestionStatus: ${error.message}`);
  return data as SuggestionRow | null;
}
