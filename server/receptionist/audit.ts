import OpenAI from "openai";
import { receptionistConfig } from "./config";
import { createSuggestion, updateCall, type CallRow, type TenantRow } from "./storage";

// Self-audit loop, stage 1: score every completed call with an LLM judge and
// mine unanswered questions into dashboard suggestions the owner can approve.

export interface CallScore {
  outcome: "booked" | "answered" | "escalated" | "missed" | "voicemail" | "unknown";
  sentiment: "positive" | "neutral" | "negative";
  resolved: boolean;
  accuracyRisk: boolean;
  summary: string;
  unansweredQuestions: string[];
}

const JUDGE_INSTRUCTIONS = `You are a QA analyst reviewing an AI receptionist's call transcript.
Return strict JSON with keys:
- outcome: one of booked | answered | escalated | missed | voicemail | unknown
- sentiment: caller's sentiment, one of positive | neutral | negative
- resolved: boolean — did the caller get what they needed?
- accuracyRisk: boolean — did the agent state anything not supported by its instructions, or guess?
- summary: one sentence describing the call
- unansweredQuestions: array of questions the caller asked that the agent could not answer from its knowledge (empty array if none)`;

export async function scoreCall(tenant: TenantRow, call: CallRow): Promise<CallScore | null> {
  const { audit } = receptionistConfig;
  if (!audit.configured || !call.transcript?.trim()) return null;

  const openai = new OpenAI({ apiKey: audit.openaiApiKey });
  const completion = await openai.chat.completions.create({
    model: audit.judgeModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: JUDGE_INSTRUCTIONS },
      {
        role: "user",
        content: `Business: ${tenant.business_name} (${tenant.niche})\n\nTranscript:\n${call.transcript.slice(0, 24_000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;
  let score: CallScore;
  try {
    score = JSON.parse(raw) as CallScore;
  } catch {
    return null;
  }

  await updateCall(call.id, {
    outcome: score.outcome,
    sentiment: score.sentiment,
    escalated: score.outcome === "escalated",
    score: score as unknown as Record<string, unknown>,
  });

  // Mine knowledge gaps into approve-able suggestions.
  for (const question of score.unansweredQuestions ?? []) {
    await createSuggestion({
      tenant_id: tenant.id,
      source_call_id: call.id,
      type: "faq_gap",
      title: `Callers are asking: "${question}"`,
      detail: "The receptionist had no answer for this. Approve to add it to the knowledge base (you'll provide the answer), or dismiss if not relevant.",
      proposed_faq: { question, answer: "" },
    });
  }
  if (score.accuracyRisk) {
    await createSuggestion({
      tenant_id: tenant.id,
      source_call_id: call.id,
      type: "knowledge",
      title: "A call may have contained inaccurate info",
      detail: `Review this call's transcript: ${score.summary}`,
    });
  }

  return score;
}
