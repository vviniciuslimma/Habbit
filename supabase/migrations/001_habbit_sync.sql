-- Habbit owns this schema; existing Treinago objects are preserved.
create schema if not exists habbit;
revoke all on schema habbit from public, anon, authenticated;
grant usage on schema habbit to service_role;
create table habbit.documents (
  owner_id text primary key,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint habbit_payload_object check (jsonb_typeof(payload) = 'object')
);
alter table habbit.documents enable row level security;
revoke all on habbit.documents from public, anon, authenticated;
grant select, insert, update, delete on habbit.documents to service_role;
create function public.habbit_read(p_owner text)
returns jsonb language sql security invoker set search_path = '' as $$
 select coalesce((select jsonb_build_object('data', payload, 'revision', revision, 'updated_at', updated_at) from habbit.documents where owner_id = p_owner), jsonb_build_object('data', null, 'revision', 0));
$$;
create function public.habbit_write(p_owner text, p_data jsonb, p_revision bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
 if p_revision = 0 then
   insert into habbit.documents(owner_id,payload) values (p_owner,p_data)
   on conflict (owner_id) do nothing
   returning jsonb_build_object('revision',revision,'updated_at',updated_at) into result;
 else
   update habbit.documents set payload=p_data, revision=revision+1, updated_at=now()
   where owner_id=p_owner and revision=p_revision
   returning jsonb_build_object('revision',revision,'updated_at',updated_at) into result;
 end if;
 if result is null then return jsonb_build_object('conflict',true); end if;
 return result;
end;
$$;
revoke all on function public.habbit_read(text) from public, anon, authenticated;
revoke all on function public.habbit_write(text,jsonb,bigint) from public, anon, authenticated;
grant execute on function public.habbit_read(text) to service_role;
grant execute on function public.habbit_write(text,jsonb,bigint) to service_role;
