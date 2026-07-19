import type { OnboardingForm } from "@shared/receptionist-schema";
import { receptionistConfig } from "./config";
import * as ghl from "./ghl-client";
import * as retell from "./retell-client";
import { buildSystemPrompt, buildBeginMessage } from "./niche-packs";
import {
  createTenant,
  updateTenant,
  getTenantById,
  tenantToForm,
  type TenantRow,
  type ProvisionStep,
} from "./storage";

// Provisioning orchestrator — GHL-as-hub architecture.
//
// The AI receptionist itself lives in GHL: each niche snapshot ships a
// pre-built Conversation AI / Voice AI employee whose prompts reference
// location custom values (e.g. {{ custom_values.ai_receptionist_prompt }}).
// Provisioning = create the sub-account from the snapshot, then write the
// business-specific values. The wrapper is the only UI the client ever sees.
//
// Steps are idempotent (recorded on the tenant row, skipped once done) so a
// failed run can be re-triggered. Missing keys record "simulated" instead of
// failing, keeping the whole flow testable before accounts exist.

const STEPS = ["ghl_location", "ghl_ai_config", "a2p_registration"] as const;
export type StepName = (typeof STEPS)[number];

// Custom-value names the niche snapshots must reference in their AI prompts
// and workflows. Keep in sync with snapshot authoring.
export const CUSTOM_VALUE_KEYS = {
  prompt: "AI Receptionist Prompt",
  greeting: "AI Receptionist Greeting",
  transferNumber: "AI Transfer Number",
} as const;

function stamp(status: ProvisionStep["status"], detail?: string): ProvisionStep {
  return { status, detail, at: new Date().toISOString() };
}

async function recordStep(
  tenant: TenantRow,
  step: StepName,
  result: ProvisionStep,
  extraPatch: Record<string, unknown> = {},
): Promise<TenantRow> {
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

/** Push the tenant's AI configuration into GHL location custom values. */
async function writeAiConfig(locationId: string, form: OnboardingForm): Promise<void> {
  await ghl.setCustomValue(locationId, CUSTOM_VALUE_KEYS.prompt, buildSystemPrompt(form));
  await ghl.setCustomValue(locationId, CUSTOM_VALUE_KEYS.greeting, buildBeginMessage(form));
  if (form.escalation?.transferNumber) {
    await ghl.setCustomValue(locationId, CUSTOM_VALUE_KEYS.transferNumber, form.escalation.transferNumber);
  }
}

/** Run (or resume) provisioning for a tenant. Safe to call repeatedly. */
export async function provisionTenant(tenantId: string): Promise<TenantRow> {
  let tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  const form = tenantToForm(tenant);

  tenant = await updateTenant(tenant.id, { status: "provisioning" });

  // Step 1: GHL sub-account from the niche snapshot. The snapshot carries the
  // CRM setup (pipelines, calendars, workflows) AND the AI employee.
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
        tenant = await recordStep(
          tenant,
          "ghl_location",
          stamp(
            "done",
            snapshotId
              ? `location ${location.id} from snapshot ${snapshotId}`
              : `location ${location.id} (no snapshot configured — AI employee must be added manually)`,
          ),
          { ghl_location_id: location.id },
        );
      } catch (err) {
        tenant = await recordStep(tenant, "ghl_location", stamp("error", (err as Error).message));
        return updateTenant(tenant.id, { status: "error" });
      }
    } else {
      tenant = await recordStep(tenant, "ghl_location", stamp("simulated", "GHL_API_KEY not set — skipped"));
    }
  }

  // Step 2: write business-specific AI config into location custom values so
  // the snapshot's AI employee speaks for THIS business.
  if (!stepDone(tenant, "ghl_ai_config")) {
    if (ghl.ghlConfigured() && tenant.ghl_location_id) {
      try {
        await writeAiConfig(tenant.ghl_location_id, form);
        tenant = await recordStep(tenant, "ghl_ai_config", stamp("done", "AI prompt, greeting, and transfer number written to location custom values"));
      } catch (err) {
        tenant = await recordStep(tenant, "ghl_ai_config", stamp("error", (err as Error).message));
        return updateTenant(tenant.id, { status: "error" });
      }
    } else {
      tenant = await recordStep(tenant, "ghl_ai_config", stamp("simulated", "GHL not configured — skipped"));
    }
  }

  // Step 3: A2P 10DLC — needs EIN + address; carrier approval takes days and
  // is submitted through GHL per client. Recorded as a manual step so the
  // dashboard shows it pending until completed.
  if (!stepDone(tenant, "a2p_registration")) {
    const hasLegal = Boolean(tenant.ein && tenant.address);
    tenant = await recordStep(
      tenant,
      "a2p_registration",
      stamp(
        "manual",
        hasLegal
          ? "EIN and address captured — submit registration in GHL (carrier approval takes days)"
          : "Missing EIN/address — collect before SMS features can be enabled",
      ),
    );
  }

  const anyError = Object.values(tenant.provisioning ?? {}).some((s) => s.status === "error");
  return updateTenant(tenant.id, { status: anyError ? "error" : "active" });
}

/**
 * Push current tenant settings (greeting, FAQs, hours, services, escalation)
 * to the live receptionist: GHL custom values always; legacy Retell agent too
 * if one was provisioned before the GHL-native pivot.
 */
export async function syncAgentPrompt(tenant: TenantRow): Promise<{ synced: boolean; detail: string }> {
  const form = tenantToForm(tenant);
  const details: string[] = [];
  let synced = false;

  if (ghl.ghlConfigured() && tenant.ghl_location_id) {
    await writeAiConfig(tenant.ghl_location_id, form);
    details.push("GHL AI config updated");
    synced = true;
  }
  if (retell.retellConfigured() && tenant.retell_llm_id) {
    await retell.updateAgentPrompt(tenant.retell_llm_id, buildSystemPrompt(form), buildBeginMessage(form));
    details.push("Retell agent prompt updated");
    synced = true;
  }
  if (!synced) {
    details.push("No live integrations configured — settings saved, sync skipped");
  }
  return { synced, detail: details.join("; ") };
}
