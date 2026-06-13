import { getSendGridCredentials } from "./sendgrid";

const APP_NAME = "GrowthPortal";
// Optional override when the SendGrid connector itself doesn't carry a verified
// sender address (SendGrid requires the from-address to be verified).
const FALLBACK_FROM =
  process.env.INVITE_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "";

export interface InviteEmailParams {
  to: string;
  fromName: string;
  link: string;
  customMessage?: string;
}

export interface SendResult {
  sent: boolean;
  error?: string;
}

export async function isEmailConfigured(): Promise<boolean> {
  const creds = await getSendGridCredentials();
  return !!creds && !!(creds.fromEmail || FALLBACK_FROM);
}

function buildContent(fromName: string, link: string, customMessage?: string) {
  const intro = customMessage?.trim()
    ? customMessage.trim()
    : `${fromName} is using ${APP_NAME} to understand how others perceive them, and would value your honest feedback.`;

  const subject = `${fromName} is asking for your feedback`;

  const text = [
    intro,
    "",
    "Your personal, single-use feedback link:",
    link,
    "",
    "It takes about 5 minutes, you can choose to remain anonymous, and this link only works once.",
  ].join("\n");

  const safeIntro = intro.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #2d2a26;">
      <p style="font-size: 15px; line-height: 1.6;">${safeIntro}</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${link}" style="background: #4f7942; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">Give your feedback</a>
      </p>
      <p style="font-size: 13px; color: #6b675f; line-height: 1.6;">
        It takes about 5 minutes, you can choose to remain anonymous, and this link only works once.
      </p>
      <p style="font-size: 12px; color: #9a958c; word-break: break-all;">Or paste this link into your browser:<br/>${link}</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<SendResult> {
  const creds = await getSendGridCredentials();
  if (!creds) {
    return { sent: false, error: "Email delivery is not configured." };
  }

  const from = creds.fromEmail || FALLBACK_FROM;
  if (!from) {
    return { sent: false, error: "No verified sender email is configured." };
  }

  const { subject, text, html } = buildContent(params.fromName, params.link, params.customMessage);

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: from, name: APP_NAME },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });

    if (res.status >= 200 && res.status < 300) {
      return { sent: true };
    }

    let message = `Email provider returned status ${res.status}`;
    try {
      const body: any = JSON.parse(await res.text());
      if (body?.errors?.[0]?.message) message = body.errors[0].message;
    } catch {
      /* keep default message */
    }
    return { sent: false, error: message };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
