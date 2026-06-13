---
name: Peer feedback instruments & one-time invites
description: Constraints for the multi-instrument peer_feedback table and Supabase one-time invite consumption
---

# Peer feedback: instruments, segmentation, one-time invites

## Two instruments share one table
`peer_feedback` stores BOTH Big Five rows (NEOAC-keyed scores) and 360 rows
(competency-keyed scores: COMMUNICATION/RELIABILITY/EMPATHY/COLLABORATION/ADAPTABILITY),
distinguished by the `instrument` column ('big-five' default, or 'peer-360').

**Rule:** any Big Five (NEOAC) average MUST filter to rows where
`instrument !== 'peer-360'`, or competency-keyed 360 scores silently pollute the
average (they share the same `scores` jsonb but different keys). This filter is
required in THREE independent surfaces: the server GET `/api/peer-feedback/:userId`
average, the home-tab radar peer averages, and the dashboard peer-feedback-tab.
**Why:** old rows / missing column default to big-five; a single missed filter
corrupts the headline self-vs-peer numbers.

## One-time invite consumption must be burn-before-insert
The Supabase JS client (service_role) has no transactions. Naive
check-status → insert-feedback → mark-used is NOT race-safe: two concurrent
submits with the same token both pass the pre-check and both insert.

**Correct pattern:** conditional update FIRST as an atomic compare-and-set —
`update peer_invites set used_at=now() where token=? and used_at is null` with
`.select()`; a returned row means you won the race, zero rows means already used
(reject 409). Only then insert the feedback. If the insert fails, revert
`used_at` back to null so the invitee can retry.
**Why:** without the burn-before-insert + returned-row check, the token is
replayable. Keep the early status check too (better UX / expiry handling), but it
is not the safety mechanism.

## Server is the source of truth for invite-carried fields
When an `inviteToken` is supplied, the server overrides client-sent
`relationship`/`instrument` with the values stored on the invite row, and
validates token ownership (`target_user_id === :userId`). Relationship is
required and validated against `relationshipValues`.

## peer_invites is service-role only
`peer_invites` has RLS enabled with NO policies, so it is only reachable through
the Express server (service_role), never the browser Supabase client. Invite
creation goes through authenticated POST `/api/peer-invites`; public resolution
through GET `/api/peer-invite/:token` returns no PII (just userId, relationship,
instrument, status).

## Invite emails are runtime-credentialed with a copy-link fallback
POST `/api/peer-invites` accepts `recipients` (emails) → creates one single-use
invite per recipient and emails each its own link server-side; a bare `count`
still works as the legacy link-only path. Email creds are resolved at request
time from EITHER the SendGrid connector proxy OR a `SENDGRID_API_KEY` secret
(+ `INVITE_FROM_EMAIL` for the verified sender) — never stored in repo. When no
provider is configured, the route returns the links and the UI shows copyable
per-recipient links instead of failing.
**Why:** the feature must work before any email provider is connected (users may
decline the integration), and SendGrid rejects unverified senders.
**Blocked:** persisting recipient email / sent-status onto the invite row for a
dashboard "sent/pending/used per person" view needs a new `peer_invites` column,
but external Supabase is no-DDL via the JS client — so status is only returned
transiently in the response, not persisted.

## Matched self mini-form is app-only
The "matched self-view" (30 "I…"-worded mirror of the peer items) is stored in
`localStorage` under `matched-self:${userId}` — deliberately NO schema/table. It
exists for an apples-to-apples self-vs-peer gap on identical anchors.
