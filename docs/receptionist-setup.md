# AI Receptionist Module — Setup Guide

The receptionist module is a self-contained "wrapper app" inside this repo: clients fill
out one onboarding form, the platform provisions a GoHighLevel sub-account + Retell voice
agent + phone number automatically, and clients manage everything (calls, transcripts,
reports, improvement suggestions, settings) from our portal — never logging into GHL or
Retell. See `docs/ai-receptionist-tech-stack.md` for the market research and architecture
decision (GHL-as-hub, Q5).

## Module layout

| Path | Purpose |
|---|---|
| `shared/receptionist-schema.ts` | Drizzle tables + zod onboarding-form/settings contracts |
| `supabase/migrations/20260718_receptionist_module.sql` | Tables + per-tenant RLS policies |
| `server/receptionist/config.ts` | Env config; every integration degrades to simulated mode without keys |
| `server/receptionist/ghl-client.ts` | GHL API v2: create sub-account from niche snapshot, contacts, notes |
| `server/receptionist/retell-client.ts` | Retell: create LLM+agent, buy number, webhook signature verify |
| `server/receptionist/niche-packs.ts` | Per-vertical prompt packs (salon, medical, leasing, ...) + prompt builder |
| `server/receptionist/onboarding.ts` | Idempotent provisioning orchestrator (resumable, per-step status) |
| `server/receptionist/audit.ts` | LLM-as-judge call scoring + FAQ-gap mining into suggestions |
| `server/receptionist/routes.ts` | Portal API + Retell webhook receiver |
| `client/src/pages/receptionist-onboarding.tsx` | 4-step client setup wizard (`/receptionist/onboarding`) |
| `client/src/pages/receptionist-dashboard.tsx` | Client portal dashboard (`/receptionist`) |
| `scripts/onboard-client.ts` | CLI onboarding for ops use |

## Environment variables

All optional — without keys, provisioning records steps as `simulated` so the whole flow
(form → orchestrator → dashboard) is testable before any accounts exist.

```bash
# GoHighLevel (Agency Private Integration token + agency company id)
GHL_API_KEY=pit-...
GHL_COMPANY_ID=...
# Niche snapshots (pre-built sub-account templates to clone). Optional per niche:
GHL_SNAPSHOT_DEFAULT=...
GHL_SNAPSHOT_SALON=...
GHL_SNAPSHOT_MEDICAL=...
# (pattern: GHL_SNAPSHOT_<NICHE> using niche keys from shared/receptionist-schema.ts)

# Retell
RETELL_API_KEY=key_...
RETELL_VOICE_ID=11labs-Adrian     # optional, default shown
RETELL_AREA_CODE=415              # optional preference for purchased numbers

# Call audit (LLM-as-judge)
OPENAI_API_KEY=sk-...
RECEPTIONIST_JUDGE_MODEL=gpt-4o-mini  # optional, default shown

# Required for webhook registration on provisioned agents
PUBLIC_BASE_URL=https://yourapp.example.com
```

Key handling: use a **scoped** GHL Private Integration token (locations, contacts,
calendars, conversations), store keys as deployment secrets, and rotate any key that was
ever pasted into a chat or ticket.

## First-time setup

1. Apply the migration: run `supabase/migrations/20260718_receptionist_module.sql` against
   the Supabase project (SQL editor or `supabase db push`).
2. Set env vars above (or none, for simulated mode).
3. `npm run dev`, sign in, and visit `/receptionist/onboarding`.

## Provisioning flow

`POST /api/receptionist/onboarding` → orchestrator runs idempotent steps, each recorded on
`receptionist_tenants.provisioning`:

1. **ghl_location** — creates the GHL sub-account, cloning `GHL_SNAPSHOT_<NICHE>` if set.
2. **retell_agent** — builds the system prompt (niche pack + business facts + FAQs) and
   creates the Retell LLM + agent (with transfer-to-human tool when a number is provided).
3. **phone_number** — buys a number bound to the agent.
4. **a2p_registration** — recorded as `manual`: A2P 10DLC needs EIN/address and carrier
   approval takes days; submit via GHL/Twilio and mark done.

Failed runs set tenant status `error`; `POST /api/receptionist/provision/retry` resumes
from the first incomplete step.

## Self-improvement loop (v1)

Retell fires `call_analyzed` webhooks → transcript stored in `receptionist_calls` → judge
scores outcome/sentiment/accuracy → unanswered caller questions become `faq_gap` rows in
`receptionist_suggestions` → owner approves with an answer in the dashboard → FAQ folds
into the knowledge base and the live agent prompt re-syncs immediately.

Next iterations (not yet built): ingest the business's human call recordings (Deepgram
transcription) and mine them the same way; weekly email digest; regression-test prompt
changes against simulated calls (Hamming/Coval) before syncing.

## Security model

- Every API route requires Supabase auth; all queries scoped by `owner_user_id`/tenant.
- Postgres RLS on all three tables as defense-in-depth (anon-key access can only see the
  caller's own tenant).
- Retell webhook verified via HMAC-SHA256 `x-retell-signature` over the raw body.
- Recording consent line is baked into the default greeting; per-niche compliance rules
  (medical PHI minimization, Fair Housing for leasing) live in `niche-packs.ts`.
