create extension if not exists pgcrypto;

create table if not exists public.board_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'colaborador' check (role in ('admin','socio','diretor','gestor','rh','auditor','colaborador')),
  directorate text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.board_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  actor_id uuid references auth.users(id),
  action text not null,
  previous_version bigint,
  new_version bigint,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.board_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  title text not null,
  category text not null,
  confidentiality text not null default 'Interno' check (confidentiality in ('Interno','Restrito','Conselho')),
  status text not null default 'Rascunho',
  version text not null default '1.0',
  storage_path text,
  content_type text,
  size_bytes bigint,
  effective_date date,
  review_date date,
  owner_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

insert into public.board_workspaces (slug, name)
values ('acessa', 'Acessa')
on conflict (slug) do nothing;

create or replace function public.board_current_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.board_profiles where user_id = auth.uid() and active = true $$;

create or replace function public.board_handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.board_profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists board_on_auth_user_created on auth.users;
create trigger board_on_auth_user_created after insert on auth.users
for each row execute function public.board_handle_new_user();

insert into public.board_profiles (user_id, display_name, role)
select
  p.id,
  coalesce(nullif(p.full_name, ''), p.email),
  case
    when bool_or(ur.role::text = 'admin') then 'admin'
    when bool_or(ur.role::text = 'rh') then 'rh'
    when bool_or(ur.role::text = 'gestor') then 'gestor'
    when bool_or(ur.role::text = 'lider') then 'gestor'
    else 'colaborador'
  end
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
group by p.id, p.full_name, p.email
on conflict (user_id) do nothing;

create or replace function public.board_sync_platform_role()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.board_profiles
  set role = coalesce((
    select case
      when bool_or(role::text = 'admin') then 'admin'
      when bool_or(role::text = 'rh') then 'rh'
      when bool_or(role::text = 'gestor') then 'gestor'
      when bool_or(role::text = 'lider') then 'gestor'
      else 'colaborador'
    end
    from public.user_roles where user_id = target_user
  ), 'colaborador'), updated_at = now()
  where user_id = target_user;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists board_sync_user_role on public.user_roles;
create trigger board_sync_user_role after insert or update or delete on public.user_roles
for each row execute function public.board_sync_platform_role();

create or replace function public.board_audit_workspace_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  insert into public.board_audit_events (workspace_id, actor_id, action, previous_version, new_version)
  values (old.id, auth.uid(), 'workspace_updated', old.version, new.version);
  return new;
end;
$$;

drop trigger if exists board_workspace_audit on public.board_workspaces;
create trigger board_workspace_audit before update on public.board_workspaces
for each row execute function public.board_audit_workspace_update();

alter table public.board_profiles enable row level security;
alter table public.board_workspaces enable row level security;
alter table public.board_audit_events enable row level security;
alter table public.board_documents enable row level security;

create policy "board_profiles_read_self_or_leadership" on public.board_profiles for select to authenticated
using (user_id = auth.uid() or public.board_current_role() in ('admin','socio','diretor','rh','auditor'));
create policy "board_profiles_admin_update" on public.board_profiles for update to authenticated
using (public.board_current_role() in ('admin','socio','rh')) with check (public.board_current_role() in ('admin','socio','rh'));

create policy "board_workspace_read" on public.board_workspaces for select to authenticated
using (exists (select 1 from public.board_profiles p where p.user_id = auth.uid() and p.active));
create policy "board_workspace_edit" on public.board_workspaces for update to authenticated
using (public.board_current_role() in ('admin','socio','diretor','gestor','rh'))
with check (public.board_current_role() in ('admin','socio','diretor','gestor','rh'));

create policy "board_audit_read" on public.board_audit_events for select to authenticated
using (public.board_current_role() in ('admin','socio','diretor','auditor'));

create policy "board_documents_read" on public.board_documents for select to authenticated
using (
  confidentiality = 'Interno'
  or owner_id = auth.uid()
  or public.board_current_role() in ('admin','socio','diretor','rh','auditor')
);
create policy "board_documents_create" on public.board_documents for insert to authenticated
with check (public.board_current_role() in ('admin','socio','diretor','gestor','rh'));
create policy "board_documents_update" on public.board_documents for update to authenticated
using (owner_id = auth.uid() or public.board_current_role() in ('admin','socio','diretor','rh'))
with check (owner_id = auth.uid() or public.board_current_role() in ('admin','socio','diretor','rh'));

insert into storage.buckets (id, name, public)
values ('acessa-board-documents', 'acessa-board-documents', false)
on conflict (id) do nothing;

create policy "board_storage_read" on storage.objects for select to authenticated
using (bucket_id = 'acessa-board-documents');
create policy "board_storage_write" on storage.objects for insert to authenticated
with check (bucket_id = 'acessa-board-documents' and public.board_current_role() in ('admin','socio','diretor','gestor','rh'));
create policy "board_storage_update" on storage.objects for update to authenticated
using (bucket_id = 'acessa-board-documents' and public.board_current_role() in ('admin','socio','diretor','rh'));

create index if not exists board_audit_workspace_time_idx on public.board_audit_events (workspace_id, occurred_at desc);
create index if not exists board_documents_workspace_idx on public.board_documents (workspace_id, archived_at, category);
