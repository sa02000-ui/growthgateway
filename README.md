# Personality & Growth Portal

A longitudinal self-development web app. Users take validated psychometric
assessments over time, log significant life events, and gather peer feedback to
compare how they see themselves with how others see them.

- **Frontend:** React + Vite, Shadcn UI, Tailwind, TanStack Query
- **Backend:** Node.js + Express
- **Data/Auth:** Supabase (Postgres + Auth). A separate Postgres (`DATABASE_URL`)
  currently holds profiles/life-events (see *Independence* below).
- **AI:** OpenAI-compatible API for growth insights
- **Email:** SendGrid for peer-invite emails

---

## Quick start (local)

```bash
npm ci
cp .env.example .env      # then fill in real values (see .env.example)
npm run dev               # serves API + client on http://localhost:5000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run API + client in dev mode (Vite middleware) |
| `npm run check` | TypeScript type-check (`tsc`) — the core CI gate |
| `npm run build` | Production build (`script/build.ts`) |
| `npm run start` | Run the production build (`dist/index.cjs`) |
| `npm run db:push` | Apply Drizzle schema to `DATABASE_URL` |
| `npx tsx security/check-rls.ts` | Assert the Supabase RLS lockdown is still in force |

## Environment

All configuration is via environment variables — see [`.env.example`](.env.example)
for the full, documented list. Nothing is hardcoded; set these in `.env` locally
or in your host's secret manager. Never commit a real `.env` (it is gitignored).

## Database migrations (Supabase)

Schema changes are tracked as code under [`supabase/migrations/`](supabase/migrations)
and applied with the Supabase CLI. **Every schema change should be a committed
migration — never ad-hoc SQL.**

```bash
# One-time: link the local CLI to the Supabase project (needs the DB password)
npx supabase link --project-ref <your-project-ref>

# Capture the current live schema as a baseline (run once, then commit the result)
npx supabase db pull

# Create a new migration, edit the generated .sql, then apply it
npx supabase migration new <name>
npx supabase db push
```

> The RLS lockdown lives in [`security/`](security). `security/check-rls.ts`
> verifies it from the outside using the anon key; CI runs it when the
> `SUPABASE_URL` / `SUPABASE_ANON_KEY` repo secrets are set.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR
to `main`: type-check, build, and (when secrets are configured) the RLS drift
check. This is the automated gate that lets any change be verified without
manual review of the basics.

---

## Independence (running without Replit)

This repo is designed to be the single source of truth so **any tool or person
can clone, change, and deploy it** without Replit. Current Replit couplings and
how to remove them:

1. **Hosting / publishing.** Replit deploys from its own workspace. To make
   `git push` the publish action, connect this GitHub repo to a host
   (Vercel / Render / Railway) with auto-deploy on `main`. After that, Replit is
   just one optional editor.
2. **Two databases → one.** Profiles, life-events, profile-history and
   `shared_results` currently live in a Replit-managed Postgres via
   `DATABASE_URL`. Repoint `DATABASE_URL` at the **Supabase** Postgres
   connection string and migrate those tables into Supabase, so there is a
   single database any tool can reach. Then schema changes flow through
   `supabase/migrations/`.
3. **Replit-only env.** `REPL_ID` (Vite Cartographer plugin) and the SendGrid
   connector vars (`REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`,
   `WEB_REPL_RENEWAL`) are read only when present; the app falls back to the
   standard vars (`SENDGRID_API_KEY`, etc.) everywhere else. They are not
   required to run off Replit.

Once (1) and (2) are done, the full loop is tool-agnostic:
**clone → edit → `supabase db push` → `git push` → host auto-deploys.**
