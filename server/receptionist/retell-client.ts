import { createHmac, timingSafeEqual } from "crypto";
import { receptionistConfig } from "./config";

// Thin typed wrapper over the Retell AI API.
// Docs: https://docs.retellai.com/api-references
// A Retell agent = a Retell LLM (prompt + tools) + voice + phone number.

const { retell } = receptionistConfig;

async function retellFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${retell.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${retell.apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Retell ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

export interface CreateAgentInput {
  agentName: string;
  systemPrompt: string;
  beginMessage: string;
  webhookUrl?: string;
  transferNumber?: string;
}

export interface RetellAgent {
  llmId: string;
  agentId: string;
}

/** Create the LLM (prompt + transfer tool) then the agent that speaks it. */
export async function createAgent(input: CreateAgentInput): Promise<RetellAgent> {
  const tools: Record<string, unknown>[] = [{ type: "end_call", name: "end_call", description: "End the call politely once the caller's needs are met." }];
  if (input.transferNumber) {
    tools.push({
      type: "transfer_call",
      name: "transfer_to_human",
      description: "Transfer the caller to a human team member when they ask for a person or the situation requires it.",
      transfer_destination: { type: "predefined", number: input.transferNumber },
    });
  }

  const llm = await retellFetch<{ llm_id: string }>("/create-retell-llm", {
    method: "POST",
    body: JSON.stringify({
      general_prompt: input.systemPrompt,
      begin_message: input.beginMessage,
      general_tools: tools,
    }),
  });

  const agent = await retellFetch<{ agent_id: string }>("/create-agent", {
    method: "POST",
    body: JSON.stringify({
      agent_name: input.agentName,
      voice_id: retell.voiceId,
      response_engine: { type: "retell-llm", llm_id: llm.llm_id },
      webhook_url: input.webhookUrl || undefined,
      enable_backchannel: true,
      interruption_sensitivity: 0.9,
      normalize_for_speech: true,
    }),
  });

  return { llmId: llm.llm_id, agentId: agent.agent_id };
}

/** Update the LLM prompt (used when settings/FAQs change). */
export async function updateAgentPrompt(llmId: string, systemPrompt: string, beginMessage?: string): Promise<void> {
  await retellFetch(`/update-retell-llm/${llmId}`, {
    method: "PATCH",
    body: JSON.stringify({ general_prompt: systemPrompt, ...(beginMessage ? { begin_message: beginMessage } : {}) }),
  });
}

/** Buy a number and bind it to the agent for inbound calls. */
export async function createPhoneNumber(agentId: string, nickname: string): Promise<string> {
  const res = await retellFetch<{ phone_number: string }>("/create-phone-number", {
    method: "POST",
    body: JSON.stringify({
      inbound_agent_id: agentId,
      nickname,
      ...(retell.areaCode ? { area_code: retell.areaCode } : {}),
    }),
  });
  return res.phone_number;
}

/**
 * Verify Retell's webhook signature (x-retell-signature header):
 * HMAC-SHA256 of the raw request body keyed with the API key.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!retell.configured) return true; // simulated mode — nothing to verify against
  if (!signature) return false;
  const expected = createHmac("sha256", retell.apiKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const retellConfigured = () => retell.configured;
