-- Dados sensíveis não devem permanecer no JSON compartilhado do workspace.
-- Esta migração cria domínios separados, auditáveis e protegidos por RLS.

create table if not exists public.board_employee_compensation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  person_id text not null,
  company text not null,
  employment_type text not null,
  base_salary numeric(14,2) not null default 0 check (base_salary >= 0),
  variable_pay numeric(14,2) not null default 0 check (variable_pay >= 0),
  employer_cost numeric(14,2) not null default 0 check (employer_cost >= 0),
  effective_from date not null,
  effective_to date,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.board_supplier_contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  company text not null,
  category text not null,
  supplier text not null,
  object text not null,
  monthly_value numeric(14,2) not null default 0 check (monthly_value >= 0),
  allocation_rule text not null,
  start_date date,
  end_date date,
  notice_days integer not null default 0 check (notice_days >= 0),
  status text not null,
  document_id uuid references public.board_documents(id),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.board_shared_expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  supplier text not null,
  object text not null,
  competence date not null,
  total numeric(14,2) not null check (total >= 0),
  paid_by text not null,
  allocation_rule text not null,
  status text not null,
  document_id uuid references public.board_documents(id),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  system text not null,
  base_url text,
  authorized_scope text not null,
  status text not null default 'Não conectado',
  secret_reference text,
  last_sync_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_employee_compensation enable row level security;
alter table public.board_supplier_contracts enable row level security;
alter table public.board_shared_expenses enable row level security;
alter table public.board_integration_connections enable row level security;

create policy "compensation_restricted_read" on public.board_employee_compensation for select to authenticated
using (public.board_current_role() in ('admin','socio','rh'));
create policy "compensation_restricted_write" on public.board_employee_compensation for all to authenticated
using (public.board_current_role() in ('admin','socio','rh'))
with check (public.board_current_role() in ('admin','socio','rh'));

create policy "supplier_contracts_leadership_read" on public.board_supplier_contracts for select to authenticated
using (public.board_current_role() in ('admin','socio','diretor','auditor'));
create policy "supplier_contracts_leadership_write" on public.board_supplier_contracts for all to authenticated
using (public.board_current_role() in ('admin','socio','diretor'))
with check (public.board_current_role() in ('admin','socio','diretor'));

create policy "shared_expenses_leadership_read" on public.board_shared_expenses for select to authenticated
using (public.board_current_role() in ('admin','socio','diretor','auditor'));
create policy "shared_expenses_finance_write" on public.board_shared_expenses for all to authenticated
using (public.board_current_role() in ('admin','socio','diretor'))
with check (public.board_current_role() in ('admin','socio','diretor'));

create policy "connections_admin_read" on public.board_integration_connections for select to authenticated
using (public.board_current_role() in ('admin','socio'));
create policy "connections_admin_write" on public.board_integration_connections for all to authenticated
using (public.board_current_role() in ('admin','socio'))
with check (public.board_current_role() in ('admin','socio'));

create index if not exists compensation_workspace_person_idx on public.board_employee_compensation (workspace_id, person_id, effective_from desc);
create index if not exists supplier_contracts_workspace_idx on public.board_supplier_contracts (workspace_id, status, end_date);
create index if not exists shared_expenses_workspace_competence_idx on public.board_shared_expenses (workspace_id, competence desc);
create index if not exists integration_connections_workspace_idx on public.board_integration_connections (workspace_id, system);

comment on column public.board_integration_connections.secret_reference is
  'Referência ao segredo armazenado no cofre/ambiente do servidor. Nunca armazenar token ou senha em texto puro.';
