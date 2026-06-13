---
name: Likert label builders are duplicated in routes.ts
description: server/routes.ts derives Likert option labels in TWO separate places that must be kept in sync
---

server/routes.ts builds human-readable Likert option labels (`likertScale`) for
assessment-take endpoints in **two separate branches** that must stay in sync:
one static/seed path and one DB-fallback path. They are near-identical if/else
chains keyed on `inputType`.

**Why:** adding a new input scale (or a slug-specific label override) to only one
path silently ships wrong/blank options for the other code path. Phase 5 had to
add `likert_0_5`, `likert_4`, `likert_3` to both.

**How to apply:**
- Any new `input_type` scale OR slug-specific label override must be added to BOTH
  builders.
- Slug-specific branches (e.g. `i-panas-sf` custom likert_5, `gse-10` vs generic
  likert_4) MUST be placed BEFORE the generic branch for that same scale, or the
  generic case wins and the override never fires.
- Cantril (`ladder_0_10`) is the exception: it renders as a slider in the explore
  tab, not from `likertScale`, so its scale array can be empty.
