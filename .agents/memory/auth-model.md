---
name: Auth & authorization model
description: How authorization works across the Express API and why server-side checks are the only safe layer
---

# Authorization model

Every Express data route talks to Supabase using the **service_role** key
(`server/db.ts` prefers `SUPABASE_SERVICE_ROLE_KEY`). Service role bypasses
Postgres RLS entirely.

**Rule:** the ONLY authorization layer for user-scoped data is the Express
`requireAuth` middleware (`server/auth.ts`), which verifies the Bearer token via
`supabase.auth.getUser` and sets `req.userId`. Routes must derive the user via
`getUserId(req)` and **never** trust a client-supplied `userId`/`resultId` from
the URL or body.

**Why:** trusting client IDs caused a full IDOR/auth-bypass (the original audit
finding). Service role means no DB-side safety net.

**How to apply:**
- New user-scoped route → add `requireAuth`, use `getUserId(req)`, and for
  by-id resources verify ownership before returning/mutating.
- Public-by-design routes stay open: `/api/config` (anon key only), health,
  assessments-library list, `*questions`, peer-feedback questions, POST
  peer-feedback/:userId (submitting feedback ABOUT a user), feedback-token/:token
  resolve, shared-result/:token.
- The browser must send the token: `client/src/lib/queryClient.ts` attaches it for
  `apiRequest` + default query fn; raw `fetch` calls to protected routes must spread
  `await getAuthHeaders()`.

# Supabase RLS caveat (separate from Express)

Because the anon key is shipped to the browser, any table with a permissive anon
policy is readable directly, bypassing Express. `feedback_tokens` had a public
anon-read policy that must be dropped at the DB level — Express auth cannot
protect against direct anon-key table reads. Always lock RLS on tables that hold
mappings/PII, even though the server uses service role.
