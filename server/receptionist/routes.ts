import type { Express, Request, Response } from "express";
import { onboardingFormSchema, tenantSettingsSchema } from "@shared/receptionist-schema";
import { requireAuth, getUserId } from "../auth";
import { writeLimiter } from "../rate-limit";
import { startOnboarding, provisionTenant, syncAgentPrompt } from "./onboarding";
import { verifyWebhookSignature, retellConfigured } from "./retell-client";
import { ghlConfigured } from "./ghl-client";
import { receptionistConfig } from "./config";
import { scoreCall } from "./audit";
import * as store from "./storage";

// API surface for the client portal ("wrapper app"): clients onboard, watch
// provisioning, see calls/reports/suggestions, and tweak settings — without
// ever logging into GHL or Retell.

async function requireTenant(req: Request, res: Response): Promise<store.TenantRow | null> {
  const tenant = await store.getTenantByOwner(getUserId(req));
  if (!tenant) {
    res.status(404).json({ error: "No receptionist set up yet" });
    return null;
  }
  return tenant;
}

export function registerReceptionistRoutes(app: Express): void {
  // ---- Onboarding ----

  app.post("/api/receptionist/onboarding", requireAuth, writeLimiter, async (req, res) => {
    try {
      const existing = await store.getTenantByOwner(getUserId(req));
      if (existing && existing.status !== "error") {
        res.status(409).json({ error: "A receptionist already exists for this account", tenantId: existing.id });
        return;
      }
      const parsed = onboardingFormSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid form", issues: parsed.error.issues });
        return;
      }
      const tenant = await startOnboarding(getUserId(req), parsed.data);
      res.status(201).json({ tenant });
    } catch (err) {
      console.error("[receptionist] onboarding failed:", err);
      res.status(500).json({ error: "Onboarding failed" });
    }
  });

  app.post("/api/receptionist/provision/retry", requireAuth, writeLimiter, async (req, res) => {
    try {
      const tenant = await requireTenant(req, res);
      if (!tenant) return;
      const updated = await provisionTenant(tenant.id);
      res.json({ tenant: updated });
    } catch (err) {
      console.error("[receptionist] provision retry failed:", err);
      res.status(500).json({ error: "Provisioning retry failed" });
    }
  });

  // ---- Tenant + settings ----

  app.get("/api/receptionist/tenant", requireAuth, async (req, res) => {
    try {
      const tenant = await store.getTenantByOwner(getUserId(req));
      res.json({
        tenant,
        integrations: {
          ghl: ghlConfigured(),
          retell: retellConfigured(),
          audit: receptionistConfig.audit.configured,
        },
      });
    } catch (err) {
      console.error("[receptionist] get tenant failed:", err);
      res.status(500).json({ error: "Failed to load tenant" });
    }
  });

  app.patch("/api/receptionist/tenant/settings", requireAuth, writeLimiter, async (req, res) => {
    try {
      const tenant = await requireTenant(req, res);
      if (!tenant) return;
      const parsed = tenantSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid settings", issues: parsed.error.issues });
        return;
      }
      const updated = await store.applySettings(tenant, parsed.data);
      const sync = await syncAgentPrompt(updated);
      res.json({ tenant: updated, sync });
    } catch (err) {
      console.error("[receptionist] settings update failed:", err);
      res.status(500).json({ error: "Settings update failed" });
    }
  });

  // ---- Calls + reports ----

  app.get("/api/receptionist/calls", requireAuth, async (req, res) => {
    try {
      const tenant = await requireTenant(req, res);
      if (!tenant) return;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const calls = await store.listCalls(tenant.id, limit, offset);
      res.json({ calls });
    } catch (err) {
      console.error("[receptionist] list calls failed:", err);
      res.status(500).json({ error: "Failed to load calls" });
    }
  });

  app.get("/api/receptionist/report", requireAuth, async (req, res) => {
    try {
      const tenant = await requireTenant(req, res);
      if (!tenant) return;
      const calls = await store.listCalls(tenant.id, 500);
      const total = calls.length;
      const byOutcome: Record<string, number> = {};
      let totalDuration = 0;
      let negative = 0;
      for (const c of calls) {
        const o = c.outcome ?? "unscored";
        byOutcome[o] = (byOutcome[o] ?? 0) + 1;
        totalDuration += c.duration_sec ?? 0;
        if (c.sentiment === "negative") negative++;
      }
      res.json({
        report: {
          totalCalls: total,
          byOutcome,
          bookedRate: total ? (byOutcome.booked ?? 0) / total : 0,
          escalatedRate: total ? (byOutcome.escalated ?? 0) / total : 0,
          negativeSentimentRate: total ? negative / total : 0,
          avgDurationSec: total ? Math.round(totalDuration / total) : 0,
        },
      });
    } catch (err) {
      console.error("[receptionist] report failed:", err);
      res.status(500).json({ error: "Failed to build report" });
    }
  });

  // ---- Suggestions (self-improvement loop, human-approved) ----

  app.get("/api/receptionist/suggestions", requireAuth, async (req, res) => {
    try {
      const tenant = await requireTenant(req, res);
      if (!tenant) return;
      const suggestions = await store.listSuggestions(tenant.id, req.query.status as string | undefined);
      res.json({ suggestions });
    } catch (err) {
      console.error("[receptionist] list suggestions failed:", err);
      res.status(500).json({ error: "Failed to load suggestions" });
    }
  });

  app.post("/api/receptionist/suggestions/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const tenant = await requireTenant(req, res);
      if (!tenant) return;
      const { action, answer } = req.body as { action?: string; answer?: string };
      if (action !== "approve" && action !== "dismiss") {
        res.status(400).json({ error: "action must be approve or dismiss" });
        return;
      }
      const suggestion = await store.setSuggestionStatus(req.params.id, tenant.id, action === "approve" ? "approved" : "dismissed");
      if (!suggestion) {
        res.status(404).json({ error: "Suggestion not found" });
        return;
      }
      // Approving an FAQ gap (with an answer supplied) folds it into the KB
      // and re-syncs the live agent prompt.
      let sync;
      if (action === "approve" && suggestion.type === "faq_gap" && suggestion.proposed_faq?.question && answer?.trim()) {
        const faqs = [...(tenant.faqs ?? []), { question: suggestion.proposed_faq.question, answer: answer.trim() }];
        const updated = await store.applySettings(tenant, { faqs });
        sync = await syncAgentPrompt(updated);
      }
      res.json({ suggestion, sync });
    } catch (err) {
      console.error("[receptionist] suggestion action failed:", err);
      res.status(500).json({ error: "Suggestion action failed" });
    }
  });

  // ---- Retell webhook (no auth; HMAC signature instead) ----

  app.post("/api/receptionist/webhooks/retell", async (req, res) => {
    try {
      const rawBody = req.rawBody ? (req.rawBody as Buffer).toString("utf8") : JSON.stringify(req.body);
      if (!verifyWebhookSignature(rawBody, req.headers["x-retell-signature"] as string | undefined)) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      const { event, call } = req.body as {
        event?: string;
        call?: {
          call_id?: string;
          agent_id?: string;
          direction?: string;
          from_number?: string;
          to_number?: string;
          start_timestamp?: number;
          end_timestamp?: number;
          transcript?: string;
          recording_url?: string;
          disconnection_reason?: string;
        };
      };

      // call_analyzed fires after call_ended with transcript + recording ready.
      if ((event !== "call_ended" && event !== "call_analyzed") || !call?.call_id || !call.agent_id) {
        res.json({ ok: true, ignored: true });
        return;
      }

      const tenant = await store.getTenantByAgentId(call.agent_id);
      if (!tenant) {
        res.json({ ok: true, ignored: true, reason: "unknown agent" });
        return;
      }

      const durationSec =
        call.start_timestamp && call.end_timestamp ? Math.round((call.end_timestamp - call.start_timestamp) / 1000) : null;

      const row = await store.upsertCall({
        tenant_id: tenant.id,
        retell_call_id: call.call_id,
        direction: call.direction ?? "inbound",
        from_number: call.from_number ?? null,
        to_number: call.to_number ?? null,
        started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : null,
        duration_sec: durationSec,
        transcript: call.transcript ?? null,
        recording_url: call.recording_url ?? null,
        disconnection_reason: call.disconnection_reason ?? null,
      });

      // Score asynchronously — never block or fail the webhook on judge errors.
      if (event === "call_analyzed") {
        scoreCall(tenant, row).catch((err) => console.error("[receptionist] call scoring failed:", err));
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("[receptionist] webhook failed:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
