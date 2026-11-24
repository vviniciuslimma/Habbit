-- Transaction-only fixtures: all test accounts and records are rolled back.
begin;
select set_config('habbit.test_a',gen_random_uuid()::text,true);
select set_config('habbit.test_b',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
 (current_setting('habbit.test_a')::uuid,'habbit-a-'||current_setting('habbit.test_a')||'@example.invalid'),
 (current_setting('habbit.test_b')::uuid,'habbit-b-'||current_setting('habbit.test_b')||'@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.test_a'),'role','authenticated')::text,true);
do $$
declare v jsonb;
begin
 v:=public.habbit_account_initialize('{"habits":[],"sessions":[],"money":[],"events":[],"marker":"A"}'::jsonb);
 if v->'data'->>'marker' <> 'A' then raise exception 'Account A bootstrap failed'; end if;
 v:=public.habbit_account_initialize('{"habits":[],"sessions":[],"money":[],"events":[],"marker":"WRONG"}'::jsonb);
 if v->'data'->>'marker' <> 'A' then raise exception 'Bootstrap was not idempotent'; end if;
 if (select count(*) from habbit.documents)<>1 then raise exception 'A can see foreign records'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.test_b'),'role','authenticated')::text,true);
do $$
declare v jsonb; affected integer;
begin
 if public.habbit_account_read() is not null then raise exception 'B can read existing account'; end if;
 v:=public.habbit_account_initialize('{"habits":[],"sessions":[],"money":[],"events":[],"marker":"B"}'::jsonb);
 if v->'data'->>'marker'<>'B' then raise exception 'Account B bootstrap failed'; end if;
 if (select count(*) from habbit.documents)<>1 then raise exception 'B can see foreign records'; end if;
 update habbit.documents set payload='{}'::jsonb where owner_id=current_setting('habbit.test_a');
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-account update allowed'; end if;
 begin
  insert into habbit.account_links(auth_user_id,document_owner) values(current_setting('habbit.test_b')::uuid,current_setting('habbit.test_a'));
  raise exception 'Cross-account ownership claim allowed';
 exception when insufficient_privilege then null;
 end;
 v:=public.habbit_account_write('{"habits":[],"sessions":[]}'::jsonb,0);
 if v->>'conflict'<>'true' then raise exception 'Stale write was not rejected'; end if;
 if has_function_privilege('anon','public.habbit_account_initialize(jsonb)','EXECUTE') then raise exception 'Anonymous initialization allowed'; end if;
end $$;
select true as account_isolation_tests_passed;
rollback;
