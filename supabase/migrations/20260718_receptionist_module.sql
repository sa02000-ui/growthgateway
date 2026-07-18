-- AI Receptionist module tables (isolated from assessment product).
-- Prefixed receptionist_ so the module can be extracted later.

create table if not exists receptionist_tenants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  status varchar not null default 'draft',
  business_name text not null,
  niche varchar not null,
  website text,
  business_phone varchar,
  contact_name text,
  contact_email text,
  legal_name text,
  ein varchar,
  address jsonb,
  logo_url text,
  custom_domain text,
  timezone varchar not null default 'America/New_York',
  business_hours jsonb,
  services jsonb,
  faqs jsonb,
  greeting text,
  escalation jsonb,
  ghl_location_id varchar,
  retell_llm_id varchar,
  retell_agent_id varchar,
  retell_phone_number varchar,
  provisioning jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receptionist_tenants_owner_idx on receptionist_tenants (owner_user_id);

create table if not exists receptionist_calls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references receptionist_tenants (id) on delete cascade,
  retell_call_id varchar unique,
  direction varchar not null default 'inbound',
  from_number varchar,
  to_number varchar,
  started_at timestamptz,
  duration_sec integer,
  transcript text,
  recording_url text,
  disconnection_reason varchar,
  outcome varchar,
  sentiment varchar,
  score jsonb,
  escalated boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists receptionist_calls_tenant_idx on receptionist_calls (tenant_id, created_at desc);

create table if not exists receptionist_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references receptionist_tenants (id) on delete cascade,
  source_call_id uuid,
  type varchar not null,
  title text not null,
  detail text,
  proposed_faq jsonb,
  status varchar not null default 'proposed',
  created_at timestamptz not null default now()
);

create index if not exists receptionist_suggestions_tenant_idx on receptionist_suggestions (tenant_id, status);

-- Per-tenant isolation. The API server uses the service-role key and scopes
-- every query by owner_user_id; RLS is defense-in-depth so client-side
-- Supabase access (anon key) can only ever see the caller's own tenant data.
alter table receptionist_tenants enable row level security;
alter table receptionist_calls enable row level security;
alter table receptionist_suggestions enable row level security;

drop policy if exists receptionist_tenants_owner on receptionist_tenants;
create policy receptionist_tenants_owner on receptionist_tenants
  for all using (auth.uid() = owner_user_id);

drop policy if exists receptionist_calls_owner on receptionist_calls;
create policy receptionist_calls_owner on receptionist_calls
  for all using (
    exists (
      select 1 from receptionist_tenants t
      where t.id = receptionist_calls.tenant_id and t.owner_user_id = auth.uid()
    )
  );

drop policy if exists receptionist_suggestions_owner on receptionist_suggestions;
create policy receptionist_suggestions_owner on receptionist_suggestions
  for all using (
    exists (
      select 1 from receptionist_tenants t
      where t.id = receptionist_suggestions.tenant_id and t.owner_user_id = auth.uid()
    )
  );
