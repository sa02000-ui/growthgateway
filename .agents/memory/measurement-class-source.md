---
name: Measurement class / cadence source of truth
description: Where trait/state class and retake cadence actually come from for the assessment catalog UI
---

# Measurement class & retake cadence: derive client-side, not from the DB

Any UI that needs an assessment's measurement class (`trait` vs `state`),
retake cadence (`retestIntervalDays`), or one-time flag must derive it from
`classifyAssessment(slug)` in `shared/reliable-change.ts` — NOT from the
`measurement_class` / `retest_interval_days` fields on the
`/api/assessments-library` response.

**Why:** `assessments_library` rows in the live (external Supabase) DB were
seeded WITHOUT those columns, so the API returns them as null/undefined for
DB-backed data. Only the static `buildAssessmentLibrary()` fallback sets them.
`shared/reliable-change.ts` has the authoritative per-slug classification and
works regardless of DB state.

**How to apply:** For catalog grouping (Foundations = trait, Check-ins =
state), cadence badges, and one-time locking, call
`classifyAssessment(a.slug || a.name)`. Fall back unclassified assessments
into Foundations so nothing silently disappears.
