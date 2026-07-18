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
