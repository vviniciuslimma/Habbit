begin;
select set_config('habbit.task_a',gen_random_uuid()::text,true);
select set_config('habbit.task_b',gen_random_uuid()::text,true);
select set_config('habbit.task_c',gen_random_uuid()::text,true);
insert into auth.users(id,email) select current_setting('habbit.task_'||x)::uuid,'task-test-'||current_setting('habbit.task_'||x)||'@example.invalid' from unnest(array['a','b','c']) x;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_a'),'role','authenticated')::text,true);
select set_config('habbit.invite',public.habbit_tasks_invite('Vini')->>'code',true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_b'),'role','authenticated')::text,true);
select set_config('habbit.connection',public.habbit_tasks_accept(current_setting('habbit.invite'),'Mãe')::text,true);
select set_config('habbit.task_id',public.habbit_tasks_create(current_setting('habbit.connection')::uuid,'Organizar a cozinha','Depois do almoço',current_date)::text,true);
do $$begin
 if public.habbit_tasks_complete(current_setting('habbit.task_id')::uuid,true) then raise exception 'Sender completed task as recipient';end if;
 begin
  update habbit.shared_tasks set recipient_id=(select auth.uid()) where id=current_setting('habbit.task_id')::uuid;
  raise exception 'Ownership change allowed';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_c'),'role','authenticated')::text,true);
do $$begin
 if (public.habbit_tasks_list()->'tasks')<>'[]'::jsonb then raise exception 'Unrelated user can read tasks';end if;
 if public.habbit_tasks_complete(current_setting('habbit.task_id')::uuid,true) then raise exception 'Unrelated user can complete task';end if;
 begin
  perform public.habbit_tasks_create(current_setting('habbit.connection')::uuid,'Unauthorized','',null);
  raise exception 'Unrelated user can create task';
 exception when insufficient_privilege then null;end;
 begin
  perform public.habbit_tasks_accept(current_setting('habbit.invite'),'Other');
  raise exception 'Invitation reused';
 exception when raise_exception then if sqlerrm='Invitation reused' then raise;end if;end;
 if public.habbit_account_read() is not null then raise exception 'Unrelated journal accessible';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_a'),'role','authenticated')::text,true);
do $$begin
 if jsonb_array_length(public.habbit_tasks_list()->'tasks')<>1 then raise exception 'Recipient cannot see task';end if;
 if not public.habbit_tasks_complete(current_setting('habbit.task_id')::uuid,true) then raise exception 'Recipient cannot complete task';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_b'),'role','authenticated')::text,true);
do $$begin
 if public.habbit_tasks_list()->'tasks'->0->>'status'<>'done' then raise exception 'Sender cannot see completion';end if;
 if public.habbit_account_read() is not null then raise exception 'Link exposed private journal';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_a'),'role','authenticated')::text,true);
select public.habbit_tasks_disconnect(current_setting('habbit.connection')::uuid);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('habbit.task_b'),'role','authenticated')::text,true);
do $$begin
 if (public.habbit_tasks_list()->'tasks')<>'[]'::jsonb then raise exception 'Revoked sender can still read tasks';end if;
 begin
  perform public.habbit_tasks_create(current_setting('habbit.connection')::uuid,'Unauthorized after revoke','',null);
  raise exception 'Revoked sender can create task';
 exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','public.habbit_tasks_list()','EXECUTE') then raise exception 'Anonymous task listing allowed';end if;
end $$;
select true as shared_tasks_tests_passed;
rollback;
