-- Own-account mapping preserves the document used by the existing private site.
create table habbit.account_links (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 document_owner text unique not null references habbit.documents(owner_id)
);
alter table habbit.account_links enable row level security;
revoke all on habbit.account_links from public, anon;
grant usage on schema habbit to authenticated;
grant select on habbit.account_links to authenticated;
create policy habbit_own_account_link on habbit.account_links for select to authenticated
 using (auth_user_id = (select auth.uid()));
grant select, update on habbit.documents to authenticated;
create policy habbit_account_read on habbit.documents for select to authenticated
 using (owner_id in (select document_owner from habbit.account_links where auth_user_id=(select auth.uid())));
create policy habbit_account_update on habbit.documents for update to authenticated
 using (owner_id in (select document_owner from habbit.account_links where auth_user_id=(select auth.uid())))
 with check (owner_id in (select document_owner from habbit.account_links where auth_user_id=(select auth.uid())));
create function public.habbit_account_read() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('data',d.payload,'revision',d.revision,'updated_at',d.updated_at)
 from habbit.documents d join habbit.account_links a on a.document_owner=d.owner_id
 where a.auth_user_id=(select auth.uid());
$$;
create function public.habbit_account_write(p_data jsonb,p_revision bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if jsonb_typeof(p_data) is distinct from 'object'
 or jsonb_typeof(p_data->'habits') is distinct from 'array'
 or jsonb_typeof(p_data->'sessions') is distinct from 'array'
 or octet_length(p_data::text)>1500000 then raise exception 'Invalid Habbit document'; end if;
 update habbit.documents d set payload=p_data,revision=d.revision+1,updated_at=now()
 from habbit.account_links a where a.document_owner=d.owner_id and a.auth_user_id=(select auth.uid()) and d.revision=p_revision
 returning jsonb_build_object('revision',d.revision,'updated_at',d.updated_at) into result;
 if result is null then return jsonb_build_object('conflict',true); end if;
 return result;
end;
$$;
revoke all on function public.habbit_account_read() from public,anon;
revoke all on function public.habbit_account_write(jsonb,bigint) from public,anon;
grant execute on function public.habbit_account_read() to authenticated;
grant execute on function public.habbit_account_write(jsonb,bigint) to authenticated;
