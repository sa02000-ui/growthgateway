/**
 * RLS regression check for the Personality & Growth Portal.
 *
 * WHY: The Supabase Row Level Security (RLS) lockdown in
 * `security/supabase_rls_lockdown.sql` is applied by hand in the Supabase SQL
 * editor and lives only in the database. If a policy is edited, RLS is disabled,
 * or an older snapshot is restored, the protection can silently disappear and
 * anonymous users could read private data or poison peer feedback again.
 *
 * This script asserts the lockdown is still in force, using the PUBLIC anon key
 * exactly as the browser would. It NEVER uses the service role key (which
 * bypasses RLS and would mask a regression).
 *
 * It mirrors the curl verification block at the bottom of
 * `security/supabase_rls_lockdown.sql`:
 *   - Sensitive tables (results_log, peer_feedback, feedback_tokens) must return
 *     0 rows to the anon key AND reject an anon INSERT with an RLS violation.
 *   - Public catalog tables (assessments_library, assessment_questions) must
 *     remain publicly readable (non-zero count).
 *
 * Exit code: 0 if every assertion passes, 1 if any assertion fails (so it can
 * run in CI or be invoked on demand).
 *
 * Run:  npx tsx security/check-rls.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
// Deliberately the ANON key only. Do NOT fall back to the service role key:
// the service role bypasses RLS and would hide exactly the drift we want to catch.
const ANON_KEY = process.env.SUPABASE_KEY;

const SENSITIVE_TABLES = ["results_log", "peer_feedback", "feedback_tokens"];
const PUBLIC_TABLES = ["assessments_library", "assessment_questions"];

type CheckResult = { ok: boolean; label: string; detail: string };

const results: CheckResult[] = [];

function record(ok: boolean, label: string, detail: string): void {
  results.push({ ok, label, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${label} — ${detail}`);
}

function anonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: ANON_KEY as string,
    Authorization: `Bearer ${ANON_KEY}`,
    ...extra,
  };
}

// Parse the total row count from a PostgREST Content-Range header
// (e.g. "0-0/11", or "*/0" when empty).
function parseCount(contentRange: string | null): number | null {
  if (!contentRange) return null;
  const total = contentRange.split("/")[1];
  if (!total || total === "*") return null;
  const n = Number(total);
  return Number.isFinite(n) ? n : null;
}

/** Read the exact row count visible to the anon key for a table. */
async function readCount(table: string): Promise<{ status: number; count: number | null }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
    method: "GET",
    headers: anonHeaders({ Prefer: "count=exact", Range: "0-0" }),
  });
  // Drain the body so the connection can be reused.
  await res.text();
  return { status: res.status, count: parseCount(res.headers.get("content-range")) };
}

/** Attempt an anon INSERT and report how it was handled. */
async function tryAnonInsert(
  table: string,
): Promise<{ status: number; code: string | null; raw: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: anonHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: "{}",
  });
  const raw = await res.text();
  let code: string | null = null;
  try {
    code = (JSON.parse(raw) as { code?: string }).code ?? null;
  } catch {
    code = null;
  }
  return { status: res.status, code, raw };
}

async function checkSensitiveTable(table: string): Promise<void> {
  // 1) Anon read must reveal 0 rows.
  try {
    const { status, count } = await readCount(table);
    if (status >= 500) {
      record(false, `${table} anon read`, `unexpected HTTP ${status} (cannot verify)`);
    } else if (count === 0) {
      record(true, `${table} anon read`, "0 rows visible to anon (expected)");
    } else if (count === null) {
      record(false, `${table} anon read`, `HTTP ${status} but row count could not be determined`);
    } else {
      record(false, `${table} anon read`, `${count} rows readable by anon — RLS not protecting reads!`);
    }
  } catch (err) {
    record(false, `${table} anon read`, `request failed: ${(err as Error).message}`);
  }

  // 2) Anon INSERT must be rejected BY RLS specifically.
  //    A 2xx means anon can write (broken). A NOT-NULL/constraint error (e.g. 23502)
  //    means the write passed RLS and only failed on a column constraint — that is
  //    ALSO a regression (this was the original peer_feedback gap). Only an RLS
  //    violation (HTTP 401/403 or Postgres code 42501) is acceptable.
  try {
    const { status, code, raw } = await tryAnonInsert(table);
    const rejectedByRls = status === 401 || status === 403 || code === "42501";
    if (status >= 200 && status < 300) {
      record(false, `${table} anon insert`, `accepted (HTTP ${status}) — anon can write!`);
    } else if (rejectedByRls) {
      record(true, `${table} anon insert`, `blocked by RLS (HTTP ${status}${code ? `, code ${code}` : ""})`);
    } else {
      record(
        false,
        `${table} anon insert`,
        `not blocked by RLS — HTTP ${status}${code ? `, code ${code}` : ""}: ${raw.slice(0, 120)}`,
      );
    }
  } catch (err) {
    record(false, `${table} anon insert`, `request failed: ${(err as Error).message}`);
  }
}

async function checkPublicTable(table: string): Promise<void> {
  try {
    const { status, count } = await readCount(table);
    // PostgREST answers a ranged GET with 206 Partial Content (200 without a range).
    const readable = status === 200 || status === 206;
    if (readable && count !== null && count > 0) {
      record(true, `${table} public read`, `${count} rows readable by anon (expected)`);
    } else if (readable && count === 0) {
      record(false, `${table} public read`, "0 rows visible to anon — catalog read may be broken");
    } else {
      record(false, `${table} public read`, `HTTP ${status}, count ${count ?? "unknown"} — expected public read`);
    }
  } catch (err) {
    record(false, `${table} public read`, `request failed: ${(err as Error).message}`);
  }
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_KEY (anon key). Set both before running this check.",
    );
    process.exit(2);
  }

  console.log("RLS regression check (anon key) against", SUPABASE_URL);
  console.log("=".repeat(72));

  for (const table of SENSITIVE_TABLES) {
    await checkSensitiveTable(table);
  }
  for (const table of PUBLIC_TABLES) {
    await checkPublicTable(table);
  }

  console.log("=".repeat(72));
  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) {
    console.log(`All ${results.length} checks passed — RLS lockdown is intact.`);
    process.exit(0);
  } else {
    console.error(`${failures.length} of ${results.length} checks FAILED — RLS protection may be off:`);
    for (const f of failures) {
      console.error(`  - ${f.label}: ${f.detail}`);
    }
    console.error("Re-apply security/supabase_rls_lockdown.sql in the Supabase SQL editor.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("RLS check crashed:", err);
  process.exit(2);
});
