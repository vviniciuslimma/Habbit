create or replace function public.habbit_tasks_list() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('me',(select auth.uid()),'connections',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from habbit.task_connections c),'[]'::jsonb),'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from habbit.shared_tasks t),'[]'::jsonb));
$$;
