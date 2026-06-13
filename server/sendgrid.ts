// Resolves SendGrid credentials from the Replit SendGrid connector at runtime.
// Nothing is stored in the repo; the connector proxy serves a short-lived key.
// Returns null when the connector has not been connected yet so callers can
// degrade gracefully instead of crashing.

export interface SendGridCredentials {
  apiKey: string;
  fromEmail: string | null;
}

let cached: { creds: SendGridCredentials; expiresAt: number } | null = null;

// Allow a manually-provided API key (stored as a Replit secret) as an
// alternative to the SendGrid connector.
function envCredentials(): SendGridCredentials | null {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;
  const fromEmail = process.env.INVITE_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || null;
  return { apiKey, fromEmail };
}

async function fetchConnectorCredentials(): Promise<SendGridCredentials | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) return null;

  try {
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=sendgrid`,
      { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } },
    );
    if (!res.ok) return null;

    const data: any = await res.json();
    const settings = data?.items?.[0]?.settings ?? {};
    const apiKey: string | undefined = settings.api_key || settings.apiKey;
    if (!apiKey) return null;

    const fromEmail: string | null =
      settings.from_email || settings.fromEmail || settings.from || null;

    return { apiKey, fromEmail };
  } catch {
    return null;
  }
}

// Connector tokens are short-lived; cache a successful lookup briefly. Never
// cache a miss, so a freshly-connected account is picked up immediately.
export async function getSendGridCredentials(): Promise<SendGridCredentials | null> {
  const fromEnv = envCredentials();
  if (fromEnv) return fromEnv;
  if (cached && cached.expiresAt > Date.now()) return cached.creds;
  const creds = await fetchConnectorCredentials();
  if (creds) cached = { creds, expiresAt: Date.now() + 60_000 };
  return creds;
}
