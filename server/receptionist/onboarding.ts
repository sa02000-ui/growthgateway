import type { OnboardingForm } from "@shared/receptionist-schema";
import { receptionistConfig } from "./config";
import * as ghl from "./ghl-client";
import * as retell from "./retell-client";
import { buildSystemPrompt, buildBeginMessage } from "./niche-packs";
import {
  createTenant,
  updateTenant,
  tenantToForm,
  type TenantRow,
  type ProvisionStep,
} from "./storage";

// Provisioning orchestrator: turns a completed onboarding form into a live
// receptionist. Steps are idempotent (recorded on the tenant row and skipped
// once done) so a failed run can be safely re-triggered. When an integration
// key is missing the step records status "simulated" instead of failing, so
// the full flow is testable before any accounts exist.

const STEPS = ["ghl_location", "retell_agent", "phone_number", "a2p_registration"] as const;
export type StepName = (typeof STEPS)[number];

function stamp(status: ProvisionStep["status"], detail?: string): ProvisionStep {
  return { status, detail, at: new Date().toISOString() };
}

async function recordStep(tenant: TenantRow, step: StepName, result: ProvisionStep, extraPatch: Record<string, unknown> = {}): Promise<TenantRow> {
  const provisioning = { ...(tenant.provisioning ?? {}), [step]: result };
  return updateTenant(tenant.id, { provisioning, ...extraPatch });
}

function stepDone(tenant: TenantRow, step: StepName): boolean {
  const s = tenant.provisioning?.[step];
  return s?.status === "done" || s?.status === "simulated" || s?.status === "manual";
}

export async function startOnboarding(ownerUserId: string, form: OnboardingForm): Promise<TenantRow> {
  const tenant = await createTenant(ownerUserId, form);
  return provisionTenant(tenant.id);
}

/** Run (or resume) provisioning for a tenant. Safe to call repeatedly. */
export async function provisionTenant(tenantId: string): Promise<TenantRow> {
  const { getTenantById } = await import("./storage");
  let tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  const form = tenantToForm(tenant);

  tenant = await updateTenant(tenant.id, { status: "provisioning" });

  // Step 1: GHL sub-account (location), cloning the niche snapshot when configured.
  if (!stepDone(tenant, "ghl_location")) {
    if (ghl.ghlConfigured()) {
      try {
        const snapshotId = receptionistConfig.ghl.snapshotFor(form.niche);
        const location = await ghl.createLocation({
          businessName: form.businessName,
          contactEmail: form.contactEmail,
          contactName: form.contactName,
          phone: form.businessPhone || undefined,
          website: form.website || undefined,
          timezone: form.timezone,
          address: form.address,
          snapshotId,
        });
        tenant = await recordStep(tenant, "ghl_location", stamp("done", snapshotId ? `location ${location.id} from snapshot ${snapshotId}` : `location ${location.id} (no snapshot configured)`), {
          ghl_location_id: location.id,
        });
      } catch (err) {
        tenant = await recordStep(tenant, "ghl_location", stamp("error", (err as Error).message));
        return updateTenant(tenant.id, { status: "error" });
      }
    } else {
      tenant = await recordStep(tenant, "ghl_location", stamp("simulated", "GHL_API_KEY not set — skipped"));
    }
  }

  // Step 2: Retell agent (prompt built from niche pack + business facts).
  if (!stepDone(tenant, "retell_agent")) {
    if (retell.retellConfigured()) {
      try {
        const webhookUrl = receptionistConfig.publicBaseUrl
          ? `${receptionistConfig.publicBaseUrl}/api/receptionist/webhooks/retell`
          : undefined;
        const agent = await retell.createAgent({
          agentName: `${form.businessName} Receptionist`,
          systemPrompt: buildSystemPrompt(form),
          beginMessage: buildBeginMessage(form),
          webhookUrl,
          transferNumber: form.escalation?.transferNumber || undefined,
        });
        tenant = await recordStep(tenant, "retell_agent", stamp("done", `agent ${agent.agentId}`), {
          retell_llm_id: agent.llmId,
          retell_agent_id: agent.agentId,
        });
      } catch (err) {
        tenant = await recordStep(tenant, "retell_agent", stamp("error", (err as Error).message));
        return updateTenant(tenant.id, { status: "error" });
      }
    } else {
      tenant = await recordStep(tenant, "retell_agent", stamp("simulated", "RETELL_API_KEY not set — skipped"));
    }
  }

  // Step 3: phone number bound to the agent.
  if (!stepDone(tenant, "phone_number")) {
    if (retell.retellConfigured() && tenant.retell_agent_id) {
      try {
        const phone = await retell.createPhoneNumber(tenant.retell_agent_id, form.businessName);
        tenant = await recordStep(tenant, "phone_number", stamp("done", phone), { retell_phone_number: phone });
      } catch (err) {
        tenant = await recordStep(tenant, "phone_number", stamp("error", (err as Error).message));
        return updateTenant(tenant.id, { status: "error" });
      }
    } else {
      tenant = await recordStep(tenant, "phone_number", stamp("simulated", "Retell not configured — skipped"));
    }
  }

  // Step 4: A2P 10DLC — needs EIN + address; carrier approval takes days and
  // is submitted through GHL/Twilio per client. Recorded as a manual step so
  // the dashboard shows it pending until completed in the provider UI.
  if (!stepDone(tenant, "a2p_registration")) {
    const hasLegal = Boolean(tenant.ein && tenant.address);
    tenant = await recordStep(
      tenant,
      "a2p_registration",
      stamp("manual", hasLegal ? "EIN and address captured — submit registration in GHL/Twilio (carrier approval takes days)" : "Missing EIN/address — collect before SMS features can be enabled"),
    );
  }

  const anyError = Object.values(tenant.provisioning ?? {}).some((s) => s.status === "error");
  return updateTenant(tenant.id, { status: anyError ? "error" : "active" });
}

/** Push current tenant settings (greeting, FAQs, hours, services) to the live agent prompt. */
export async function syncAgentPrompt(tenant: TenantRow): Promise<{ synced: boolean; detail: string }> {
  if (!retell.retellConfigured() || !tenant.retell_llm_id) {
    return { synced: false, detail: "Retell not configured or agent not provisioned — settings saved, prompt sync skipped" };
  }
  const form = tenantToForm(tenant);
  await retell.updateAgentPrompt(tenant.retell_llm_id, buildSystemPrompt(form), buildBeginMessage(form));
  return { synced: true, detail: "Live agent prompt updated" };
}
