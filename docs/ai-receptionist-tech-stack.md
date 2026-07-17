# Universal AI Receptionist Platform — Market Research & Tech Stack

**Date:** July 2026
**Goal:** A plug-and-play, multi-tenant AI receptionist that centralizes every communication channel (phone, SMS, email, webchat, social DMs), answers with business-specific knowledge, takes actions (book on calendar, send email, escalate to human), audits/improves itself from its own interactions and recorded human calls, and gives each customer a protected dashboard with settings, reports, and improvement suggestions. Benchmark: **EliseAI** (multifamily leasing), generalized to any receptionist-heavy sector.

---

## TL;DR Recommendation

**Don't build the infrastructure — and don't pick a single white-label product either, because no one product covers all your channels + self-learning + cross-sector needs today.** The winning path is a **hybrid**:

1. **Phase 1 (Month 0–3): White-label to get revenue now.** Use **Synthflow's Agency plan** (full native white-label voice AI: your domain, your logo, sub-account per client, Stripe rebilling) *or* **GoHighLevel SaaS Pro** (best omnichannel coverage: voice + SMS + email + FB/IG/WhatsApp + webchat in one white-labeled inbox). If capital is tight, **My AI Front Desk's white-label program** is the cheapest entry (~$55/receptionist wholesale, resell at $250–500/mo).
2. **Phase 2 (Month 3–9): Own the customer experience, rent the engines.** Build your own thin dashboard/onboarding layer on your existing stack (this repo is already React + Node + Drizzle + Supabase — a good fit) and drive **Retell AI** (voice, API-first, HIPAA/SOC 2 included) + **Chatwoot** (open-source omnichannel inbox: email, webchat, WhatsApp, FB, IG, SMS) + **Cal.com** (open-source, embeddable, white-label scheduling) via API. Add **Ragie or pgvector** for per-tenant knowledge bases and **Hamming/Coval** for the self-audit loop.
3. **Phase 3 (Month 9+, only if unit economics demand it): Own the voice pipeline** with **Pipecat or LiveKit Agents** + **Telnyx/Twilio** telephony + **Deepgram/ElevenLabs**, cutting per-minute costs ~50–70% at scale.

This gets you selling in weeks, keeps every layer swappable, and never locks your customer data or brand inside someone else's product.

---

## 1. The Benchmark: What EliseAI Actually Is

EliseAI is the category leader in multifamily leasing AI. Its feature set is the template for what "receptionist done right" looks like in one vertical:

- **Omnichannel:** manages conversations across voice, SMS, email, and webchat so prospects never repeat themselves; voice in 7 languages, written responses in 51.
- **Action-taking:** schedules/reschedules tours (including self-guided), does post-tour follow-up, handles renewals, payment reminders, delinquency workflows.
- **Deep vertical integration:** two-way sync with property management systems (Yardi, RealPage, Entrata) and CRMs — this is its real moat, not the AI.
- **EliseCRM dashboards:** AI performance analytics on leasing, renewals, payments, delinquency.
- **Pricing:** not public; industry norm for the category is **$3–8/unit/month** (a 300-unit property pays ~$900–2,400/mo).

**Key takeaways for your product:**

1. EliseAI does **not** white-label and is enterprise-sales-driven — you can't pick it up and rebrand it.
2. Its moat is **vertical workflow depth** (PMS integrations, tour scheduling logic), not generic conversation ability. Your "portable core + niche training pack" idea is exactly right: the core (channels, scheduling, escalation, dashboard) is portable; the per-niche value is in integrations and workflow templates (PMS for leasing, EHR/PMS for medical, POS/reservations for restaurants, FSM tools like ServiceTitan/Jobber for home services).
3. Multifamily specifically is crowded (EliseAI, Funnel, BetterBot, Knock by RealPage, ResiDesk, Colleen) — compete there with price + breadth, or start in less-saturated niches (home services, salons, chiropractic) where the same core sells at $200–500/mo with far less integration burden.

---

## 2. Option A — White-Label an Existing Product (fastest to market)

You asked: *"If there is a product out there that I can pick up and white label, I want to use that."* Here's the honest landscape (July 2026):

| Product | White-label? | What you get | Wholesale cost | Gaps for your vision |
|---|---|---|---|---|
| **Synthflow (Agency plan)** | ✅ Full native (custom domain, logo, sub-accounts, Stripe rebilling, feature gating) | No-code voice AI builder, 50+ integrations, templates for top-20 service verticals, per-client minute allocation | ~$1,250/mo incl. 6,000 min, then $0.12/min; contracts often ~$30k/yr | Voice-first; weak email/social channels; branding removal historically a complaint |
| **GoHighLevel (SaaS Pro)** | ✅ Full platform rebrand + rebilling with markup | The **only** one covering your full channel list: Voice AI + SMS + email + FB Messenger + IG DM + WhatsApp + webchat unified inbox, plus CRM, calendars, funnels, review management | $497/mo platform + AI Employee $97/mo/account + voice ~$0.16/min + $0.02/msg (all markup-able) | Jack-of-all-trades; voice quality below Retell/Vapi; you inherit GHL's UX complexity |
| **My AI Front Desk (white-label)** | ✅ (branded dashboard, Stripe billing built in) | Turnkey AI receptionist deployable in ~5 min, 100+ voices, unlimited simultaneous calls, 6,000+ Zapier integrations, feature gating per client | From ~$55/receptionist/mo wholesale + $0.12/min overage; program from ~$500/mo | Phone-centric; thin email/social; less control over conversation logic |
| **Trillet, Ringlyn, Stammer, Convocore, LeadsMagnet, Answrr** | ✅ (various) | Agency-oriented AI receptionist platforms, $197–2,497/mo flat | e.g. Trillet $299/mo + $0.12/min (claims native HIPAA/SOC 2); Ringlyn $2,497/mo unlimited sub-accounts | Younger companies; most comparison content is vendor-written — validate with trials |
| **Retell AI / Vapi / Bland** | ❌ no native white-label | Best-in-class voice **infrastructure** (APIs) | Retell from $0.07/min (HIPAA/SOC 2 included); Vapi from ~$0.05/min (+$1,000/mo HIPAA add-on ⚠️); Bland flat $0.09/min | You build the dashboard/branding yourself (that's Phase 2) |
| **Smith.ai / Ruby** | ❌ own-brand services | Hybrid AI + human receptionists | Per-call / per-minute retail | Services, not platforms; can't rebrand |
| **EliseAI / Funnel / Knock** | ❌ | Vertical leasing AI | Enterprise, ~$3–8/unit/mo | Enterprise sales, single vertical, no reseller program |

**Reseller economics (validated across multiple programs):** typical SMB retail price for an AI receptionist is **$197–597/mo**; wholesale costs put steady-state net margins at **65–80%**. Break-even on the pricier platforms is ~9–20 clients.

**Verdict on Option A:** Nothing white-labelable today matches your full vision (all channels + self-training + per-niche packs + customer-owned data). But Synthflow or GHL gets you a sellable branded product in **days**, which funds and informs Phase 2. Treat white-label as a go-to-market vehicle, not the destination.

---

## 3. Option B — Assemble Best-in-Class Components (recommended core)

Every layer of your vision already exists as a rentable product. The build is the **glue + onboarding + dashboard**, not the infrastructure.

### 3.1 Channel layer (centralize all communication)

| Channel | Recommended tool | Why |
|---|---|---|
| Phone/voice | **Retell AI** (managed) → later Pipecat/LiveKit (owned) | ~600ms latency, $0.07/min base, SOC 2 Type 1+2, HIPAA + GDPR, self-serve BAA at no extra cost — the compliance story alone beats Vapi's $1,000/mo HIPAA add-on |
| Phone numbers/SIP | **Twilio** (breadth) or **Telnyx** (cheaper, better voice rates) | Commodity; keep portable via SIP so you can switch |
| SMS | Twilio/Telnyx (same account) | 10DLC registration is per-tenant — automate it in onboarding |
| Unified inbox (email, webchat widget, WhatsApp, FB Messenger, IG DM, Telegram, SMS) | **Chatwoot** (open source, self-hostable, MIT-licensed alternative to Intercom/Zendesk) | One API + one widget covers your entire non-voice channel list; multi-brand/multi-inbox model maps cleanly to multi-tenant; you own the data (important for HIPAA and for your "customer data made available separately" requirement) |
| Website plugin | Chatwoot's embeddable widget, rebranded | One `<script>` tag per customer = plug-and-play |

### 3.2 Brain layer (knowledge + decisions)

- **LLM:** Claude (Anthropic) or GPT-class models via API for conversation + decision-making (schedule / answer / email / escalate). Use a smaller, faster model for routing and a stronger model for drafting and complex turns.
- **Per-tenant knowledge base (RAG):** **Ragie** (managed RAG-as-a-service with built-in per-tenant isolation) if you want zero infra, or **pgvector on your existing Postgres/Supabase** with mandatory `tenant_id` filtering if you want it in-house. Ingestion: **Firecrawl** for crawling each customer's website into markdown; document upload for price lists, FAQs, policies.
- **Onboarding = filling a schema, not engineering:** business profile (hours, services, pricing, staff, policies) + website crawl + document upload + calendar connect + phone number port/forward + niche template selection. This is the "plug and play" — target < 1 hour per customer, mostly self-serve.
- **Niche packs:** versioned prompt/workflow/integration bundles per vertical (leasing: tour booking + PMS sync; medical: appointment + intake + HIPAA mode; restaurant: reservations + hours/menu; home services: job intake + estimate ranges + dispatch escalation). This is your durable IP.

### 3.3 Action layer (scheduling, email, escalation)

- **Scheduling:** **Cal.com** — open source, white-label, embeddable React components, booking-based pricing, API-first; each tenant connects their Google/Outlook calendar. (Cronofy is the upgrade path when you need complex multi-staff availability, e.g., medical; Nylas if you also want email/contacts sync through one API.)
- **Email send/receive:** tenant's own mailbox via Nylas (or Gmail/Microsoft Graph APIs) so replies come from *their* address; transactional via Resend/SES.
- **Human escalation:** warm transfer to a forwarding number (Retell supports transfer), plus Chatwoot agent handoff for text channels; configurable escalation rules per tenant ("always escalate emergencies / billing disputes / angry sentiment").
- **CRM/vertical integrations:** start with Zapier/Make webhooks (covers thousands of SMB tools cheaply), then build native two-way integrations per niche as it proves out (Yardi/RealPage/Entrata for leasing, ServiceTitan/Jobber/Housecall Pro for home services, Jane/DrChrono for clinics, OpenTable/Toast for restaurants, Boulevard/Vagaro for salons).

### 3.4 Platform layer (multi-tenant SaaS)

Your existing repo stack extends naturally:

- **App:** React (client/) + Node/TypeScript (server/) + Drizzle ORM + Postgres (Supabase).
- **Tenancy:** single database, `tenant_id` on every row + Postgres Row-Level Security (Supabase RLS) — this simultaneously satisfies "customer data protected and made available to customers separately." Per-tenant encrypted secrets vault for their API keys/calendar tokens.
- **Customer dashboard:** conversation transcripts + recordings, outcomes (booked/answered/escalated/missed), tweakable settings (greeting, voice, hours, escalation rules, booking rules, blackout topics), audit log of every AI action, reports (call volume, resolution rate, booking conversion, revenue attributed), and AI-generated improvement suggestions (see §4).
- **Billing:** Stripe subscriptions + metered usage (minutes/messages) per tenant.

---

## 4. The Self-Improvement Loop (audit + train from its own and human calls)

This is the part almost no white-label product ships, and it's your second durable differentiator. **Important framing: in 2026 production practice, "self-training" means automated evaluation + retrieval/prompt updates with human approval — not continuous fine-tuning of model weights.**

1. **Capture everything:** all AI conversations (Retell provides recordings + transcripts natively); ingest the business's **human** call recordings (from their VoIP — RingCentral/Dialpad/Twilio — or simple upload/inbox drop) and transcribe with **Deepgram** (fast, cheap, word-level timestamps).
2. **Score every conversation (LLM-as-judge):** resolution?, correct info?, booking completed?, sentiment, escalation appropriateness, compliance (disclosures given?). **Hamming** (audio-native evals, 1,000+ concurrent simulated calls, production call replay) or **Coval** (simulation-first, production monitoring, human review queues to calibrate the judge) are the purpose-built tools — rent one rather than building eval infra.
3. **Mine the gaps:** cluster failed/escalated conversations → "callers keep asking about weekend availability and the KB has no answer" → auto-draft a KB addition or new FAQ entry.
4. **Human-in-the-loop update:** proposed changes land in the tenant dashboard as **improvement suggestions**; owner clicks approve → KB/prompt/workflow updates. Human calls are mined the same way: extract Q&A pairs, pricing quotes, objection handling from the business's best human interactions and propose them as KB entries.
5. **Regression-test before deploy:** every prompt/KB change runs against a simulated call suite (Hamming/Coval) so "training itself" never silently degrades a live receptionist.
6. **Weekly report:** per-tenant email/dashboard digest — volume, outcomes, money booked, top unanswered questions, suggested settings changes.

---

## 5. Compliance & Data Protection (non-negotiables)

- **TCPA:** the FCC has confirmed AI-generated voices count as "artificial or prerecorded voice." Inbound answering is low-risk; **outbound** calls/texts (follow-ups, reminders) require prior express consent, DNC checking, and calling-window enforcement. Statutory damages are $500–1,500 **per call** — build consent capture into the platform, not the tenant's promise.
- **Call recording consent:** twelve all-party-consent states (CA, CT, FL, IL, MD, MA, MI, MT, NV, NH, PA, WA). Standard cure: every call opens with "This call may be recorded…" disclosure — make it a platform default that tenants cannot silently disable. Also disclose the AI nature of the agent at call start (an explicit federal AI-disclosure rule was proposed in 2024 and is still pending as of mid-2026, but artificial-voice identification rules already apply — just do it).
- **HIPAA (medical/dental/chiro niches):** BAAs with every vendor touching PHI — this is why Retell (BAA included free) beats Vapi ($1,000/mo HIPAA add-on) for your stack; self-hosted Chatwoot keeps PHI on your infra; encrypt in transit (TLS 1.3/SRTP) and at rest (AES-256). Ship a "HIPAA mode" toggle in the medical niche pack (stricter retention, no SMS PHI, audit trails).
- **Retention:** keep recordings ≥ 4 years (TCPA statute of limitations); 7 for HIPAA-adjacent.
- **Tenant isolation:** RLS everywhere, tenant-scoped vector search (`tenant_id` filter is a security boundary, not an optimization), per-tenant data export + deletion (also buys you GDPR/CCPA readiness).

---

## 6. Cost Model (per customer, Phase 2 assembled stack)

Assume a typical SMB: ~500 voice minutes + ~1,000 messages/mo.

| Component | Est. cost/mo |
|---|---|
| Voice (Retell all-in ~$0.12–0.15/min × 500) | $60–75 |
| Telephony number + SMS (Telnyx/Twilio) | $5–15 |
| LLM tokens (chat/email/scoring) | $10–30 |
| RAG (Ragie or pgvector share) | $5–20 |
| Chatwoot hosting share + Cal.com | $5–10 |
| Eval/QA tooling share (Hamming/Coval) | $10–25 |
| **Total COGS** | **~$95–175** |
| **Retail (market-validated)** | **$250–600 (SMB), $800–1,500 (medical/high-touch)** |
| **Gross margin** | **~60–75%** |

Phase 1 white-label margins are similar (wholesale $55–200 vs retail $250–500) with zero build cost — which is why it's the right first move. Phase 3 (own Pipecat/LiveKit pipeline) drops voice COGS to roughly $0.03–0.06/min but adds DevOps burden; only worth it past ~50–100k min/mo.

---

## 7. Phased Roadmap

**Phase 1 — Sell now (Month 0–3).** Pick Synthflow Agency (voice-first) or GHL SaaS Pro (omnichannel) → brand it → onboard 5–15 customers in 1–2 niches (recommend home services + salons/chiro first; save multifamily until you have PMS integrations) → learn what settings/reports customers actually touch.

**Phase 2 — Own the experience (Month 3–9).** Build the thin platform on this repo's stack: onboarding wizard, tenant dashboard, settings, reports. Wire Retell (voice) + Chatwoot (text channels) + Cal.com (booking) + Ragie/pgvector (knowledge) + Stripe (billing). Add the eval loop (Hamming/Coval + Deepgram ingestion of human calls). Migrate Phase-1 customers; retire the rented white-label.

**Phase 3 — Deepen moats (Month 9+).** Native niche integrations (PMS, EHR, FSM, POS) one vertical at a time; multifamily entry with Yardi/RealPage/Entrata connectors; consider owned voice pipeline (Pipecat/LiveKit + Telnyx + Deepgram + ElevenLabs) when volume justifies; SOC 2 audit of your own platform; launch your **own** reseller/white-label program (the market you'd be buying from in Phase 1 proves people pay $200–2,500/mo for exactly that).

---

## 8. Addendum — Follow-up Q&A (July 2026)

### Q1: Can everything run inside a single GoHighLevel agency account with a custom frontend on top?

**Mostly yes — this is a legitimate consolidation of the Phase 1/2 stack.** GHL SaaS Pro covers the unified inbox (SMS, email, FB Messenger, IG DM, WhatsApp, webchat), Voice AI, calendars, CRM, workflows, sub-account-per-client, and rebilling. [GHL API v2](https://marketplace.gohighlevel.com/docs/) supports programmatic sub-account provisioning and building a fully custom client dashboard on GHL data (contacts, conversations, calendars, payments, webhooks) so clients never see GHL. Known limits:

- **Voice quality:** GHL Voice AI (~$0.16/min) trails Retell/Vapi on latency and interruption handling. Mitigation: external voice agents can be wired into GHL sub-accounts via webhooks — swap only the voice layer later.
- **No real RAG/self-improvement:** Conversation AI's per-sub-account training (site crawl + Q&A) is shallow; the eval/KB-mining loop (§4) remains a build regardless.
- **API rate limits:** 100 req/10s burst, 200k req/day per app per resource — fine for dashboards, plan for it in real-time features.
- **HIPAA:** paid add-on required before medical clients; verify BAA scope covers AI features.
- **Platform risk:** the custom frontend is the hedge — it keeps the customer relationship portable if GHL is outgrown.

**Verdict:** GHL + custom frontend replaces ~70% of the assembled stack; the differentiators (great voice, per-tenant RAG, self-audit loop) bolt on incrementally via API/webhooks without re-platforming.

### Q2: Isn't Twilio cheaper/better than Retell for voice?

**Different layers.** Twilio is the carrier: [$0.0085/min inbound, $0.014/min outbound](https://www.twilio.com/en-us/pricing) for raw audio — no STT, no LLM, no TTS, no turn-taking. Retell is the AI conversation engine *on top of* a carrier (it uses Twilio/Telnyx underneath or accepts a BYO number): its $0.07/min (~[$0.11–0.15/min all-in](https://www.retellai.com/blog/ai-voice-agent-pricing-full-cost-breakdown-platform-comparison-roi-analysis)) buys the orchestration — streaming STT/LLM/TTS, ~600ms turn latency, barge-in handling, voicemail detection, transfers. Using "just Twilio" for an AI receptionist means **Twilio ConversationRelay**: a WebSocket that streams call audio to your server where you supply STT/LLM/TTS yourself — i.e., building your own pipeline (Q3). Cheaper per minute, expensive in engineering.

### Q3: How to build the Phase-3 owned voice pipeline

```
Caller → PSTN number (Telnyx/Twilio, ~$0.01/min)
       → SIP → LiveKit SIP bridge or Twilio ConversationRelay
       → agent process (Pipecat or LiveKit Agents, Python):
           VAD (Silero, free)
           → STT: Deepgram streaming (~$0.006/min)
           → tenant RAG lookup + LLM w/ tools (~$0.01–0.03/min)
              tools: check_availability / book_appointment / send_email / transfer_to_human
           → TTS: Cartesia (~$0.02/min) or ElevenLabs Flash
       → audio back to caller
```

- **Framework:** Pipecat (pipeline-of-processors control, v1.0 April 2026) if phone-voice is the whole product; LiveKit Agents if browser/video calls are on the roadmap (its SIP bridge makes phone calls identical to web calls). Managed middle step: Pipecat Cloud / LiveKit Cloud (autoscaling, PSTN, HIPAA).
- **All-in cost:** ~$0.04–0.07/min vs Retell's $0.11–0.15 (50–60% cut).
- **The hard 20%:** sub-800ms voice-to-voice latency (stream every stage, start TTS mid-LLM-sentence); interruption/turn-taking (cancel in-flight LLM+TTS cleanly); telephony edge cases (voicemail detection, DTMF, hold, transfers, noisy audio → Krisp); ops (concurrency autoscaling, recording storage, eval regression suites via Hamming/Coval before every change).
- **Effort:** 1–2 strong engineers, 2–3 months to production quality, permanent ops load. Break-even: ~$3.5–5k/mo saved at 50k min/mo; clearly worth it at 200k+ min/mo or when pipeline control becomes a product requirement.

### Q4: What is My AI Front Desk itself built on?

**Not publicly disclosed — but it's an assembly of the same commodity components in this doc.** Confirmed: **Zapier** (its "6,000+ integrations" is the Zapier catalog), **Stripe** (built into white-label billing), aggregated neural TTS ("100+ voices" implies multiple commodity TTS vendors), and a standard STT → LLM → TTS loop at sub-800ms per third-party reviews. Near-certain by inference: a programmable carrier (Twilio/Telnyx class — instant number provisioning, $0.12/min overages, A2P 10DLC SMS registration) and a GPT-class LLM via API (5-minute "training" = prompt/knowledge injection, not model training). Their site blocks automated access to the privacy policy/subprocessor list; no founder interview or job posting names vendors.

**Strategic implication:** MAFD's business is the glue layer (orchestration, onboarding wizard, reseller dashboard, billing) wrapped around ~$0.03–0.06/min of commodity parts, wholesaled at ~$55/receptionist + $0.12/min. That's exactly the layer Phase 2 of this plan builds and owns — white-labeling in Phase 1 rents their production tuning (turn-taking, edge cases, uptime), not proprietary technology.

### Q5: Why not just use GHL as the hub and plug applications in as needed? (DECISION)

**Correct — this supersedes the §3 "assemble it yourself" stack as the chosen architecture.** GHL already provides the CRM, unified inbox, calendars, workflows, funnels, sub-accounts, white-label, and Stripe rebilling; building or buying those separately adds cost without differentiation. Retell has a [native GHL integration](https://www.retellai.com/integrations/go-high-level) plus marketplace connectors ([Sympana](https://www.retellai.com/app-partner/sympana)) that sync agents, phone numbers, calendars, and post-call contact tagging into GHL with no code.

**Chosen architecture:**
- **Chassis:** GHL SaaS Pro — CRM, inbox (SMS/email/FB/IG/WhatsApp/webchat), calendars, workflows, billing, sub-account per client.
- **Voice plug-in:** Retell via native integration/Sympana — books into GHL calendars, tags contacts, fires GHL workflows.
- **Custom build (the only code we own):** one service for (a) per-business knowledge/RAG quality and (b) the self-audit loop — score transcripts, mine human call recordings, write results back to GHL notes/custom fields, weekly report via GHL email.
- **Plug-and-play deployment:** GHL **snapshots** — a fully configured niche sub-account (salon, clinic, leasing) cloned per new customer + connect calendar + crawl site.

**Known tripwires:** (1) GHL+Retell is a common agency playbook — moat = niche packs + knowledge quality + audit loop, not the platform; (2) platform dependency — keep brand/frontend ours and schedule data exports; (3) HIPAA needs GHL's add-on and BAA coverage across the full flow before medical clients; (4) connector glue (webhooks) needs monitoring at scale — consolidation onto owned infra is a >100-client optimization, not a starting point.

---

## 9. Glossary (plain language)

- **STT (Speech-to-Text):** software that transcribes spoken audio into text (Deepgram, AssemblyAI, Whisper). The AI "hears" through this.
- **TTS (Text-to-Speech):** software that turns text into a spoken voice (ElevenLabs, Cartesia, Amazon Polly). The AI "talks" through this.
- **LLM (Large Language Model):** the AI "brain" that reads the transcript, consults the knowledge base, and decides what to say/do. Vendor-neutral term — OpenAI's GPT, Anthropic's Claude, and Google's Gemini are all LLMs. "GPT" is technically OpenAI's brand, used colloquially for the whole category; the LLM slot in a voice pipeline is swappable between vendors.
- **STT → LLM → TTS loop:** one conversational turn: caller speaks → transcribed (STT) → LLM decides the reply → spoken back (TTS). Repeats every exchange.
- **Sub-800ms:** the loop completes in under 0.8 seconds — the silence between the caller finishing and the AI replying. Humans pause ~0.5–1s naturally; under ~800ms feels human, 2–3s makes callers hang up. The key quality metric for voice AI.
- **A2P 10DLC:** US carrier registration required for automated business texting ("Application-to-Person") from normal 10-digit numbers. Unregistered traffic is filtered/blocked. Every customer needs their own registration (days to approve) — build it into onboarding; Twilio/Telnyx file it via API.
- **Rented speech model:** using a vendor's STT/TTS/LLM via API with per-use billing instead of owning models. Nearly every AI receptionist product rents all its AI and owns only the orchestration.

---

## 10. Sources

- EliseAI: [eliseai.com](https://eliseai.com/), [platform overview](https://eliseai.com/platform-overview), [ButterflyMX MeetElise review](https://butterflymx.com/blog/meetelise-review/), [Layer3 AI leasing buyer guide (pricing norms)](https://www.layer3labs.io/guides/ai-leasing-assistant), [Revyse leasing AI reviews](https://revyse.com/categories/leasing-ai), [G2 EliseAI alternatives](https://www.g2.com/products/eliseai/competitors/alternatives), [Funnel vs EliseAI](https://funnelleasing.com/funnel-leasing-vs-eliseai-for-multifamily-operators/)
- White-label programs: [My AI Front Desk white-label](https://www.myaifrontdesk.com/white-label) + [pricing post](https://www.myaifrontdesk.com/blogs/unlock-agency-growth-transparent-my-ai-front-desk-white-label-pricing-revealed), [Synthflow agency docs](https://docs.synthflow.ai/about-agency-whitelabel) + [rebilling docs](https://docs.synthflow.ai/set-up-pricing-and-rebilling), [Ring-Ready reseller comparison](https://www.ring-ready.com/resellers/compare), [Ringlyn 2026 reseller playbook](https://www.ringlyn.com/blog/white-label-ai-voice-agent-reseller-program-2026/), [Trillet reseller comparison](https://trillet.ai/blogs/voice-agent-reseller-program-comparison) *(vendor-authored — verify with trials)*
- Voice platforms: [Retell pricing](https://www.retellai.com/pricing), [Retell compliance docs](https://docs.retellai.com/general/compliance), [Builts.ai 4-way comparison](https://builts.ai/blog/vapi-vs-bland-ai-vs-retell-ai/), [tested.media head-to-head](https://tested.media/retell-vs-vapi-vs-bland-vs-synthflow/), [CallMissed comparison](https://www.callmissed.com/en/blog/bland-ai-vs-synthflow-retell-vapi-best)
- GoHighLevel: [AI product pricing (official)](https://help.gohighlevel.com/support/solutions/articles/155000006652-ai-product-pricing), [pricing explained](https://www.highlevel.ai/pricing-explained), [AI Employee guide](https://netpartners.marketing/gohighlevel-ai-employee/)
- Omnichannel/scheduling: [Chatwoot channels](https://www.chatwoot.com/features/channels), [Chatwoot GitHub](https://github.com/chatwoot/chatwoot), [Cronofy calendar API comparison](https://www.cronofy.com/blog/best-calendar-apis), [Cal.com scheduling API post](https://cal.com/blog/best-appointment-scheduling-api), [Nylas vs Cronofy](https://cli.nylas.com/guides/cronofy-vs-nylas)
- Frameworks: [Vapi vs Pipecat vs LiveKit (Inworld)](https://inworld.ai/resources/vapi-vs-pipecat-vs-livekit), [WebRTC.ventures framework guide](https://webrtc.ventures/2026/03/choosing-a-voice-ai-agent-production-framework/), [Cekura Pipecat vs LiveKit](https://www.cekura.ai/blogs/pipecat-vs-livekit-the-real-difference)
- Eval/QA: [Hamming voice agent evaluation framework](https://hamming.ai/resources/how-to-evaluate-voice-agents-2026), [Coval vs Hamming](https://www.coval.ai/blog/coval-vs-hamming), [Speechmatics 11 testing platforms](https://www.speechmatics.com/company/articles-and-news/de-risk-your-voice-agent-11-best-voice-agent-testing-platforms)
- RAG: [Ragie](https://www.ragie.ai/), [Firecrawl open-source RAG frameworks](https://www.firecrawl.dev/blog/best-open-source-rag-frameworks), [pgvector TypeScript pipeline](https://dev.to/thegdsks/rag-with-postgres-pgvector-in-2026-the-full-typescript-pipeline-2lbd)
- Compliance: [FCC: TCPA applies to AI voices](https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices), [Henson Legal AI voice compliance](https://www.henson-legal.com/ai-voice-compliance), [Softcery US voice AI regulations guide](https://softcery.com/lab/us-voice-ai-regulations-founders-guide), [Retell TCPA playbook](https://www.retellai.com/blog/tcpa-compliance-playbook-voice-ai-outbound)
- Smith.ai/Ruby: [Smith.ai vs Ruby](https://smith.ai/virtual-receptionist-service-comparison/smith-ai-vs-ruby-receptionists), [Layer3 Smith.ai alternatives (white-label note)](https://www.layer3labs.io/comparisons/smith-ai-alternatives)
