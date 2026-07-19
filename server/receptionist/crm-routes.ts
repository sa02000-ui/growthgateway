import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, getUserId } from "../auth";
import { writeLimiter } from "../rate-limit";
import * as ghl from "./ghl-client";
import * as store from "./storage";

// CRM proxy: the wrapper front-end talks only to these endpoints; they fan out
// to the GHL API scoped to the caller's own sub-account (location). Clients
// get full CRM functionality without ever seeing GHL.
//
// Every route resolves the tenant from the authenticated user and uses THAT
// tenant's ghl_location_id — a client can never reach another location.
// Without GHL credentials, list endpoints return empty data with
// simulated: true so the UI works in test mode.

async function requireLocation(
  req: Request,
  res: Response,
): Promise<{ tenant: store.TenantRow; locationId: string } | { simulated: true } | null> {
  const tenant = await store.getTenantByOwner(getUserId(req));
  if (!tenant) {
    res.status(404).json({ error: "No receptionist set up yet" });
    return null;
  }
  if (!ghl.ghlConfigured() || !tenant.ghl_location_id) {
    return { simulated: true };
  }
  return { tenant, locationId: tenant.ghl_location_id };
}

const contactSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  tags: z.array(z.string().max(60)).optional(),
});

const messageSchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(["SMS", "Email"]),
  message: z.string().min(1).max(5000),
  subject: z.string().max(200).optional(),
});

export function registerCrmRoutes(app: Express): void {
  // ---- Contacts ----

  app.get("/api/receptionist/crm/contacts", requireAuth, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.json({ contacts: [], simulated: true });
        return;
      }
      const contacts = await ghl.listContacts(ctx.locationId, (req.query.q as string) || undefined);
      res.json({ contacts });
    } catch (err) {
      console.error("[crm] list contacts failed:", err);
      res.status(502).json({ error: "Failed to load contacts from CRM" });
    }
  });

  app.post("/api/receptionist/crm/contacts", requireAuth, writeLimiter, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.status(503).json({ error: "CRM not connected yet (test mode)" });
        return;
      }
      const parsed = contactSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid contact", issues: parsed.error.issues });
        return;
      }
      const contact = await ghl.createContact(ctx.locationId, {
        ...parsed.data,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
      });
      res.status(201).json({ contact });
    } catch (err) {
      console.error("[crm] create contact failed:", err);
      res.status(502).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/receptionist/crm/contacts/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.status(503).json({ error: "CRM not connected yet (test mode)" });
        return;
      }
      const parsed = contactSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid contact", issues: parsed.error.issues });
        return;
      }
      const contact = await ghl.updateContact(req.params.id, {
        ...parsed.data,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
      });
      res.json({ contact });
    } catch (err) {
      console.error("[crm] update contact failed:", err);
      res.status(502).json({ error: "Failed to update contact" });
    }
  });

  // ---- Inbox (conversations across SMS, email, chat, social, calls) ----

  app.get("/api/receptionist/crm/conversations", requireAuth, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.json({ conversations: [], simulated: true });
        return;
      }
      const conversations = await ghl.listConversations(ctx.locationId);
      res.json({ conversations });
    } catch (err) {
      console.error("[crm] list conversations failed:", err);
      res.status(502).json({ error: "Failed to load inbox" });
    }
  });

  app.get("/api/receptionist/crm/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.json({ messages: [], simulated: true });
        return;
      }
      const messages = await ghl.listMessages(req.params.id);
      res.json({ messages });
    } catch (err) {
      console.error("[crm] list messages failed:", err);
      res.status(502).json({ error: "Failed to load messages" });
    }
  });

  app.post("/api/receptionist/crm/messages", requireAuth, writeLimiter, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.status(503).json({ error: "CRM not connected yet (test mode)" });
        return;
      }
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid message", issues: parsed.error.issues });
        return;
      }
      const result = await ghl.sendMessage(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      console.error("[crm] send message failed:", err);
      res.status(502).json({ error: "Failed to send message" });
    }
  });

  // ---- Pipeline (opportunities) ----

  app.get("/api/receptionist/crm/pipeline", requireAuth, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.json({ pipelines: [], opportunities: [], simulated: true });
        return;
      }
      const [pipelines, opportunities] = await Promise.all([
        ghl.listPipelines(ctx.locationId),
        ghl.listOpportunities(ctx.locationId),
      ]);
      res.json({ pipelines, opportunities });
    } catch (err) {
      console.error("[crm] pipeline failed:", err);
      res.status(502).json({ error: "Failed to load pipeline" });
    }
  });

  app.patch("/api/receptionist/crm/opportunities/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.status(503).json({ error: "CRM not connected yet (test mode)" });
        return;
      }
      const stageId = (req.body as { pipelineStageId?: string }).pipelineStageId;
      if (!stageId) {
        res.status(400).json({ error: "pipelineStageId required" });
        return;
      }
      await ghl.updateOpportunityStage(req.params.id, stageId);
      res.json({ ok: true });
    } catch (err) {
      console.error("[crm] update opportunity failed:", err);
      res.status(502).json({ error: "Failed to update opportunity" });
    }
  });

  // ---- Appointments ----

  app.get("/api/receptionist/crm/appointments", requireAuth, async (req, res) => {
    try {
      const ctx = await requireLocation(req, res);
      if (!ctx) return;
      if ("simulated" in ctx) {
        res.json({ events: [], simulated: true });
        return;
      }
      const now = new Date();
      const start = (req.query.start as string) || new Date(now.getTime() - 7 * 86400_000).toISOString();
      const end = (req.query.end as string) || new Date(now.getTime() + 30 * 86400_000).toISOString();
      const events = await ghl.listCalendarEvents(ctx.locationId, start, end);
      res.json({ events });
    } catch (err) {
      console.error("[crm] appointments failed:", err);
      res.status(502).json({ error: "Failed to load appointments" });
    }
  });
}
