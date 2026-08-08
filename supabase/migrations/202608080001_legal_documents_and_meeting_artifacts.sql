-- Dossiês por marco, atas de reunião e assinatura eletrônica com evidências.
-- A assinatura interna é uma assinatura eletrônica com trilha de auditoria.
-- Atos que exijam assinatura qualificada devem usar ICP-Brasil/provedor homologado.

alter table public.board_documents
  add column if not exists relation_type text check (relation_type in ('milestone','meeting','workspace')),
  add column if not exists relation_id text,
  add column if not exists artifact_type text not null default 'document'
    check (artifact_type in ('document','minutes','transcript','recording','gemini_notes','summary')),
  add column if not exists original_filename text,
  add column if not exists sha256 text,
  add column if not exists locked_at timestamptz,
  add column if not exists signature_level text not null default 'none'
    check (signature_level in ('none','internal_advanced','qualified_icp_brasil')),
  add column if not exists external_provider text,
  add column if not exists external_envelope_id text,
  add column if not exists source_provider text,
  add column if not exists source_event_id text,
  add column if not exists source_document_url text,
  add column if not exists summary_text text;

create table if not exists public.board_document_signature_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  document_id uuid not null references public.board_documents(id) on delete restrict,
  signer_id uuid not null references auth.users(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','signed','declined','cancelled')),
  requested_at timestamptz not null default now(),
  signed_at timestamptz,
  unique (document_id, signer_id)
);

create table if not exists public.board_document_signatures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_workspaces(id) on delete restrict,
  document_id uuid not null references public.board_documents(id) on delete restrict,
  request_id uuid not null unique references public.board_document_signature_requests(id) on delete restrict,
  signer_id uuid not null references auth.users(id) on delete restrict,
  signer_name text not null,
  signer_email text,
  document_sha256 text not null,
  signature_method text not null default 'authenticated_account',
  consent_version text not null,
  user_agent text,
  authentication_aal text,
  evidence jsonb not null default '{}'::jsonb,
  signed_at timestamptz not null default now(),
  unique (document_id, signer_id)
);

alter table public.board_document_signature_requests enable row level security;
alter table public.board_document_signatures enable row level security;

create policy "signature_requests_read" on public.board_document_signature_requests for select to authenticated
using (signer_id = auth.uid() or public.board_current_role() in ('admin','socio','diretor','auditor'));

create policy "signature_requests_create" on public.board_document_signature_requests for insert to authenticated
with check (
  requested_by = auth.uid()
  and public.board_current_role() in ('admin','socio','diretor')
  and exists (
    select 1 from public.board_documents d
    where d.id = document_id and d.workspace_id = workspace_id and d.sha256 is not null
  )
);

create policy "document_signatures_read" on public.board_document_signatures for select to authenticated
using (signer_id = auth.uid() or public.board_current_role() in ('admin','socio','diretor','auditor'));

create or replace function public.board_prevent_signed_document_mutation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.board_document_signatures s where s.document_id = old.id) and (
    new.storage_path is distinct from old.storage_path
    or new.sha256 is distinct from old.sha256
    or new.title is distinct from old.title
  ) then
    raise exception 'Documento assinado é imutável; publique uma nova versão.';
  end if;
  return new;
end;
$$;

drop trigger if exists board_signed_document_immutable on public.board_documents;
create trigger board_signed_document_immutable before update on public.board_documents
for each row execute function public.board_prevent_signed_document_mutation();

create or replace function public.board_prevent_signature_mutation()
returns trigger language plpgsql
as $$ begin raise exception 'Registros de assinatura são imutáveis.'; end; $$;

drop trigger if exists board_signature_immutable on public.board_document_signatures;
create trigger board_signature_immutable before update or delete on public.board_document_signatures
for each row execute function public.board_prevent_signature_mutation();

create or replace function public.board_sign_document(
  p_document_id uuid,
  p_signer_name text,
  p_consent_version text,
  p_user_agent text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_request public.board_document_signature_requests%rowtype;
  v_document public.board_documents%rowtype;
  v_signature_id uuid;
  v_email text;
  v_aal text;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  if length(trim(coalesce(p_signer_name, ''))) < 3 then raise exception 'Informe o nome completo.'; end if;

  select * into v_request from public.board_document_signature_requests
  where document_id = p_document_id and signer_id = auth.uid() and status = 'pending'
  for update;
  if not found then raise exception 'Não existe solicitação pendente para este usuário.'; end if;

  select * into v_document from public.board_documents where id = p_document_id for update;
  if v_document.sha256 is null then raise exception 'O arquivo não possui hash de integridade.'; end if;
  if v_document.signature_level = 'qualified_icp_brasil' then
    raise exception 'Este documento exige assinatura ICP-Brasil por provedor qualificado.';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  v_aal := coalesce(auth.jwt() ->> 'aal', 'aal1');

  insert into public.board_document_signatures (
    workspace_id, document_id, request_id, signer_id, signer_name, signer_email,
    document_sha256, consent_version, user_agent, authentication_aal,
    evidence
  ) values (
    v_document.workspace_id, v_document.id, v_request.id, auth.uid(), trim(p_signer_name), v_email,
    v_document.sha256, p_consent_version, left(p_user_agent, 1000), v_aal,
    jsonb_build_object('document_version', v_document.version, 'storage_path', v_document.storage_path)
  ) returning id into v_signature_id;

  update public.board_document_signature_requests
  set status = 'signed', signed_at = now() where id = v_request.id;
  update public.board_documents set locked_at = coalesce(locked_at, now()), status = 'Em assinatura' where id = v_document.id;

  insert into public.board_audit_events (workspace_id, actor_id, action, metadata)
  values (v_document.workspace_id, auth.uid(), 'document_signed', jsonb_build_object(
    'document_id', v_document.id, 'signature_id', v_signature_id, 'sha256', v_document.sha256,
    'consent_version', p_consent_version, 'authentication_aal', v_aal
  ));
  return v_signature_id;
end;
$$;

grant execute on function public.board_sign_document(uuid,text,text,text) to authenticated;

create index if not exists board_documents_relation_idx
  on public.board_documents (workspace_id, relation_type, relation_id, artifact_type) where archived_at is null;
create index if not exists board_signature_requests_signer_idx
  on public.board_document_signature_requests (signer_id, status, requested_at desc);
create index if not exists board_signatures_document_idx
  on public.board_document_signatures (document_id, signed_at);

