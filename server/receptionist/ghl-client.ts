import { receptionistConfig } from "./config";

// Thin typed wrapper over the GoHighLevel API v2 (LeadConnector).
// Docs: https://marketplace.gohighlevel.com/docs/
// Requires an Agency-level Private Integration token (GHL_API_KEY) with
// locations/contacts/calendars scopes, plus GHL_COMPANY_ID.

const { ghl } = receptionistConfig;

async function ghlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ghl.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ghl.apiKey}`,
      Version: ghl.apiVersion,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GHL ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

export interface GhlAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface CreateLocationInput {
  businessName: string;
  contactEmail: string;
  contactName?: string;
  phone?: string;
  website?: string;
  timezone: string;
  address?: GhlAddress;
  snapshotId?: string;
}

export interface GhlLocation {
  id: string;
  name: string;
}

/** Create a client sub-account (location), optionally cloning a niche snapshot. */
export async function createLocation(input: CreateLocationInput): Promise<GhlLocation> {
  const payload: Record<string, unknown> = {
    companyId: ghl.companyId,
    name: input.businessName,
    email: input.contactEmail,
    phone: input.phone,
    website: input.website,
    timezone: input.timezone,
    address: input.address?.street,
    city: input.address?.city,
    state: input.address?.state,
    postalCode: input.address?.zip,
    country: "US",
  };
  if (input.snapshotId) {
    payload.snapshot = { id: input.snapshotId };
  }
  const res = await ghlFetch<{ id?: string; location?: GhlLocation }>("/locations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const id = res.location?.id ?? res.id;
  if (!id) throw new Error(`GHL createLocation returned no id: ${JSON.stringify(res)}`);
  return { id, name: input.businessName };
}

/** Upsert a contact into a location (used to sync callers from Retell webhooks). */
export async function upsertContact(
  locationId: string,
  contact: { phone?: string; email?: string; firstName?: string; lastName?: string; tags?: string[] },
): Promise<{ id: string }> {
  const res = await ghlFetch<{ contact: { id: string } }>("/contacts/upsert", {
    method: "POST",
    body: JSON.stringify({ locationId, ...contact }),
  });
  return { id: res.contact.id };
}

/** Attach a note (e.g. call summary + audit score) to a contact. */
export async function addContactNote(contactId: string, body: string): Promise<void> {
  await ghlFetch(`/contacts/${contactId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/** Smoke-test the token: list locations for the agency. */
export async function verifyConnection(): Promise<boolean> {
  await ghlFetch(`/locations/search?companyId=${encodeURIComponent(ghl.companyId)}&limit=1`);
  return true;
}

export const ghlConfigured = () => ghl.configured;

// ============================================================
// CRM surface — everything the wrapper's front-end needs so the
// client never logs into GHL. All calls are scoped to a single
// locationId (the tenant's sub-account); the wrapper's API layer
// enforces that the caller owns that location.
// Endpoint paths follow the GHL API v2 docs
// (https://marketplace.gohighlevel.com/docs/); verify shapes
// against a live account when credentials are first connected.
// ============================================================

export interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
  lastActivity?: string;
}

export async function listContacts(locationId: string, query?: string, limit = 50): Promise<GhlContact[]> {
  const params = new URLSearchParams({ locationId, limit: String(limit) });
  if (query) params.set("query", query);
  const res = await ghlFetch<{ contacts?: GhlContact[] }>(`/contacts/?${params}`);
  return res.contacts ?? [];
}

export async function getContact(contactId: string): Promise<GhlContact | null> {
  const res = await ghlFetch<{ contact?: GhlContact }>(`/contacts/${contactId}`);
  return res.contact ?? null;
}

export async function createContact(
  locationId: string,
  contact: { firstName?: string; lastName?: string; email?: string; phone?: string; tags?: string[] },
): Promise<GhlContact> {
  const res = await ghlFetch<{ contact: GhlContact }>("/contacts/", {
    method: "POST",
    body: JSON.stringify({ locationId, ...contact }),
  });
  return res.contact;
}

export async function updateContact(
  contactId: string,
  patch: { firstName?: string; lastName?: string; email?: string; phone?: string; tags?: string[] },
): Promise<GhlContact> {
  const res = await ghlFetch<{ contact: GhlContact }>(`/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return res.contact;
}

// ---- Conversations (unified inbox: SMS, email, chat, FB/IG, calls) ----

export interface GhlConversation {
  id: string;
  contactId: string;
  fullName?: string;
  phone?: string;
  email?: string;
  lastMessageBody?: string;
  lastMessageType?: string;
  lastMessageDate?: string;
  unreadCount?: number;
  type?: string;
}

export async function listConversations(locationId: string, limit = 50): Promise<GhlConversation[]> {
  const params = new URLSearchParams({ locationId, limit: String(limit), sortBy: "last_message_date", sort: "desc" });
  const res = await ghlFetch<{ conversations?: GhlConversation[] }>(`/conversations/search?${params}`);
  return res.conversations ?? [];
}

export interface GhlMessage {
  id: string;
  type?: string;
  messageType?: string;
  direction?: string;
  body?: string;
  dateAdded?: string;
  status?: string;
}

export async function listMessages(conversationId: string, limit = 50): Promise<GhlMessage[]> {
  const res = await ghlFetch<{ messages?: { messages?: GhlMessage[] } | GhlMessage[] }>(
    `/conversations/${conversationId}/messages?limit=${limit}`,
  );
  const m = res.messages;
  return Array.isArray(m) ? m : (m?.messages ?? []);
}

/** Send an outbound message on behalf of the business (SMS or Email). */
export async function sendMessage(input: {
  contactId: string;
  type: "SMS" | "Email";
  message: string;
  subject?: string;
}): Promise<{ messageId?: string; conversationId?: string }> {
  return ghlFetch("/conversations/messages", {
    method: "POST",
    body: JSON.stringify({
      type: input.type,
      contactId: input.contactId,
      message: input.message,
      ...(input.subject ? { subject: input.subject } : {}),
    }),
  });
}

// ---- Opportunities (pipeline) ----

export interface GhlPipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; position?: number }[];
}

export async function listPipelines(locationId: string): Promise<GhlPipeline[]> {
  const res = await ghlFetch<{ pipelines?: GhlPipeline[] }>(`/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`);
  return res.pipelines ?? [];
}

export interface GhlOpportunity {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  monetaryValue?: number;
  contact?: { id?: string; name?: string; email?: string; phone?: string };
  createdAt?: string;
  updatedAt?: string;
}

export async function listOpportunities(locationId: string, limit = 100): Promise<GhlOpportunity[]> {
  const params = new URLSearchParams({ location_id: locationId, limit: String(limit) });
  const res = await ghlFetch<{ opportunities?: GhlOpportunity[] }>(`/opportunities/search?${params}`);
  return res.opportunities ?? [];
}

export async function updateOpportunityStage(opportunityId: string, pipelineStageId: string): Promise<void> {
  await ghlFetch(`/opportunities/${opportunityId}`, {
    method: "PUT",
    body: JSON.stringify({ pipelineStageId }),
  });
}

// ---- Calendars & appointments ----

export interface GhlCalendar {
  id: string;
  name: string;
}

export async function listCalendars(locationId: string): Promise<GhlCalendar[]> {
  const res = await ghlFetch<{ calendars?: GhlCalendar[] }>(`/calendars/?locationId=${encodeURIComponent(locationId)}`);
  return res.calendars ?? [];
}

export interface GhlCalendarEvent {
  id: string;
  title?: string;
  calendarId?: string;
  contactId?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
}

export async function listCalendarEvents(
  locationId: string,
  startTime: string,
  endTime: string,
  calendarId?: string,
): Promise<GhlCalendarEvent[]> {
  const params = new URLSearchParams({ locationId, startTime, endTime });
  if (calendarId) params.set("calendarId", calendarId);
  const res = await ghlFetch<{ events?: GhlCalendarEvent[] }>(`/calendars/events?${params}`);
  return res.events ?? [];
}

// ---- Location custom values ----
// The channel through which the wrapper configures the GHL-native AI
// receptionist: the niche snapshot's Conversation AI / Voice AI prompts and
// workflows reference custom values (e.g. {{ custom_values.ai_receptionist_prompt }});
// the wrapper writes business-specific values here and the agent picks them up.

export interface GhlCustomValue {
  id: string;
  name: string;
  value: string;
}

export async function listCustomValues(locationId: string): Promise<GhlCustomValue[]> {
  const res = await ghlFetch<{ customValues?: GhlCustomValue[] }>(`/locations/${locationId}/customValues`);
  return res.customValues ?? [];
}

/** Create-or-update a named custom value on a location. */
export async function setCustomValue(locationId: string, name: string, value: string): Promise<void> {
  const existing = (await listCustomValues(locationId)).find(
    (cv) => cv.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    await ghlFetch(`/locations/${locationId}/customValues/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({ name, value }),
    });
  } else {
    await ghlFetch(`/locations/${locationId}/customValues`, {
      method: "POST",
      body: JSON.stringify({ name, value }),
    });
  }
}
