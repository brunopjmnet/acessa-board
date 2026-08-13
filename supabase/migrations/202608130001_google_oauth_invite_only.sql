-- Mantém o acesso Google restrito a pessoas previamente convidadas.
-- O primeiro usuário de uma instalação nova continua sendo o administrador inicial.
alter table public.board_profiles alter column active set default false;

create or replace function public.board_handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.board_profiles) into is_first_user;

  insert into public.board_profiles (user_id, display_name, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when is_first_user then 'admin' else 'colaborador' end,
    is_first_user
  );
  return new;
end;
$$;

comment on function public.board_handle_new_user() is
  'Cria perfis OAuth inativos por padrão. Convites administrativos ativam o perfil e definem o papel.';
