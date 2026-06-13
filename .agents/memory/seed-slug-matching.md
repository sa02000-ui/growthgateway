---
name: Assessment library seed matching
description: Why the assessments-library seed must match existing DB rows by exact slug, never fuzzy name
---

# Seed endpoint must match by exact slug, not fuzzy name

The `POST /api/assessments-library/seed` endpoint upserts assessment metadata into the
external Supabase `assessments_library` table. It must locate the existing row for each
config by **exact `slug`** (`existingBySlug` Map → `findBySlug(config.slug)`), never by name.

**Why:** An earlier fuzzy `findAssessment(name)` matched on lowercased-name substring /
shared-word heuristics (`key.includes(lower.split(' ')[0])`). Adding the Cantril ladder
("Life Evaluation Ladder") collided with the existing SWLS row ("Satisfaction with **Life**
Scale") — the seed overwrote SWLS's slug/input_type/scoring with Cantril's and never created
a real Cantril row, silently corrupting live data. Slugs are unique and stable; names are not.

**How to apply:**
- Every assessment config (cat1-3 `*.slug`, cat4/5 `*_CONFIG.slug`) must carry a unique slug,
  and the DB row's `slug` is the only safe join key. Do not re-introduce name matching.
- Question-insert idempotency is gated by a Set of `assessment_id`s that already have any
  questions (`assessmentsWithQuestions`) — it is "exists-any", so it will NOT backfill a
  partial/corrupt question set. If you ever need to repair questions, delete+reseed that row's
  questions explicitly.
- Repairing a mis-slugged live row: reset its `slug` back to the correct value first, then
  reseed — the slug-based matcher restores its metadata and inserts the genuinely-new row.
- Rows with NULL/blank slug are intentionally skipped (left as orphans) rather than fuzzily
  re-matched; this is the safe tradeoff.
