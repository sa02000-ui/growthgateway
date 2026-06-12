---
name: Assessment response & score types
description: Why there are two distinct "AssessmentResponses" types and how scores are typed end-to-end
---

# Assessment response & score types

There are TWO distinct `AssessmentResponses` types — do NOT unify them.

- `shared/schema.ts` `AssessmentResponses` = `Record<string, number>` (via `z.coerce.number()`).
  Used ONLY by the legacy IPIP-NEO-120 path (`shared/scoring.ts`, `/api/assessment/submit`,
  `assessments-tab.tsx` state). All those responses are numeric Likert 1-5, so coercing at the
  zod boundary lets scoring drop all `Number()` calls.
- `shared/scoring-engine.ts` defines its OWN `AssessmentResponses = { [k]: number | string }`.
  The union is REQUIRED: `binary_correct` (ICAR-16) and `multiple_choice` answers are genuine
  string option values (e.g. "A"), compared via `String(response).toUpperCase()` against
  `correctOption`. The generic `/api/assessments/:id/submit` passes raw req.body responses here.

**Why:** making the engine's responses numeric would silently break the cognitive/IQ test scoring.
**How to apply:** keep the schema type numeric for IPIP; keep the engine's union for dynamic tests.

## Scores
`shared/schema.ts` `AssessmentScores = Record<string, number>` represents both fixed Big-Five
(N/E/O/A/C) and dynamic multi-category keys (RIASEC, TEIQue). `StoredAssessmentResult` (also in
schema.ts) is the client query type for `/api/assessment/results` rows (snake_case). Use these
instead of `as Record<string, number>` casts in dashboard components. Server jsonb→type casts
(routes.ts, ai-insights.ts) remain because drizzle infers jsonb as `unknown`.
