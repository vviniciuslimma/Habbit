grant insert on habbit.documents, habbit.account_links to authenticated;
create policy habbit_create_own_document on habbit.documents for insert to authenticated
 with check (owner_id=(select auth.uid())::text);
create policy habbit_create_own_link on habbit.account_links for insert to authenticated
 with check (auth_user_id=(select auth.uid()) and document_owner=(select auth.uid())::text);
create function public.habbit_account_initialize(p_initial jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('habbit-init-'||(select auth.uid())::text,0));
 if exists(select 1 from habbit.account_links where auth_user_id=(select auth.uid())) then
   return public.habbit_account_read();
 end if;
 if jsonb_typeof(p_initial) is distinct from 'object'
 or jsonb_typeof(p_initial->'habits') is distinct from 'array'
 or jsonb_typeof(p_initial->'sessions') is distinct from 'array'
 or jsonb_typeof(p_initial->'money') is distinct from 'array'
 or jsonb_typeof(p_initial->'events') is distinct from 'array'
 or octet_length(p_initial::text)>1500000 then raise exception 'Invalid initial document'; end if;
 insert into habbit.documents(owner_id,payload) values((select auth.uid())::text,p_initial);
 insert into habbit.account_links(auth_user_id,document_owner) values((select auth.uid()),(select auth.uid())::text);
 return public.habbit_account_read();
end;
$$;
revoke all on function public.habbit_account_initialize(jsonb) from public,anon;
grant execute on function public.habbit_account_initialize(jsonb) to authenticated;
