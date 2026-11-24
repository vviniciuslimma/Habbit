create table habbit.task_invites (
 token_hash text primary key,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 recipient_name text not null check(char_length(recipient_name) between 1 and 60),
 expires_at timestamptz not null default now()+interval '7 days',
 used_by uuid references auth.users(id) on delete set null,
 revoked boolean not null default false,
 created_at timestamptz not null default now()
);
create table habbit.task_connections (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 sender_name text not null check(char_length(sender_name) between 1 and 60),
 recipient_name text not null check(char_length(recipient_name) between 1 and 60),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(sender_id,recipient_id),check(sender_id<>recipient_id)
);
create table habbit.shared_tasks (
 id uuid primary key default gen_random_uuid(),
 connection_id uuid not null references habbit.task_connections(id),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 1 and 200),
 notes text not null default '' check(char_length(notes)<=2000),
 due_date date,
 status text not null default 'pending' check(status in ('pending','done')),
 created_at timestamptz not null default now()
);
create index task_connections_recipient on habbit.task_connections(recipient_id);
create index shared_tasks_recipient_created on habbit.shared_tasks(recipient_id,created_at desc);
create index shared_tasks_sender_created on habbit.shared_tasks(sender_id,created_at desc);
alter table habbit.task_invites enable row level security;
alter table habbit.task_connections enable row level security;
alter table habbit.shared_tasks enable row level security;
revoke all on habbit.task_invites,habbit.task_connections,habbit.shared_tasks from public,anon,authenticated;
grant select,insert on habbit.task_invites to authenticated;
grant update(revoked) on habbit.task_invites to authenticated;
grant select on habbit.task_connections to authenticated;
grant update(active) on habbit.task_connections to authenticated;
grant select,insert on habbit.shared_tasks to authenticated;
grant update(status) on habbit.shared_tasks to authenticated;
create policy task_invite_owner_read on habbit.task_invites for select to authenticated using(recipient_id=(select auth.uid()));
create policy task_invite_owner_insert on habbit.task_invites for insert to authenticated with check(recipient_id=(select auth.uid()) and used_by is null and not revoked);
create policy task_invite_owner_revoke on habbit.task_invites for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
create policy task_connection_participants on habbit.task_connections for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create policy task_connection_recipient_revoke on habbit.task_connections for update to authenticated using(recipient_id=(select auth.uid()) and active) with check(recipient_id=(select auth.uid()) and not active);
create policy task_participants_read on habbit.shared_tasks for select to authenticated using(recipient_id=(select auth.uid()) or (sender_id=(select auth.uid()) and exists(select 1 from habbit.task_connections c where c.id=connection_id and c.active)));
create policy task_authorized_insert on habbit.shared_tasks for insert to authenticated with check(sender_id=(select auth.uid()) and status='pending' and exists(select 1 from habbit.task_connections c where c.id=connection_id and c.active and c.sender_id=shared_tasks.sender_id and c.recipient_id=shared_tasks.recipient_id));
create policy task_recipient_complete on habbit.shared_tasks for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
create function public.habbit_tasks_invite(p_name text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare code text:=replace(gen_random_uuid()::text,'-',''); exp timestamptz:=now()+interval '7 days';
begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501';end if;
 update habbit.task_invites set revoked=true where recipient_id=(select auth.uid()) and used_by is null and not revoked;
 insert into habbit.task_invites(token_hash,recipient_id,recipient_name,expires_at) values(encode(sha256(convert_to(code,'UTF8')),'hex'),(select auth.uid()),trim(p_name),exp);
 return jsonb_build_object('code',code,'expires_at',exp);
end $$;
-- Accepting a bearer invitation requires a narrow privileged operation; the helper
-- stays in the unexposed schema and validates authenticated identity and the token.
create function habbit.accept_task_invite(p_code text,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare invite habbit.task_invites%rowtype; me uuid:=(select auth.uid()); result uuid;
begin
 if me is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_code !~ '^[a-f0-9]{32}$' or char_length(trim(p_name)) not between 1 and 60 then raise exception 'Invalid invitation';end if;
 select * into invite from habbit.task_invites where token_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex') for update;
 if not found or invite.expires_at<=now() or invite.revoked or invite.used_by is not null or invite.recipient_id=me then raise exception 'Invalid or expired invitation';end if;
 insert into habbit.task_connections(sender_id,recipient_id,sender_name,recipient_name) values(me,invite.recipient_id,trim(p_name),invite.recipient_name)
 on conflict(sender_id,recipient_id) do update set active=true,sender_name=excluded.sender_name,recipient_name=excluded.recipient_name returning id into result;
 update habbit.task_invites set used_by=me where token_hash=invite.token_hash;
 return result;
end $$;
revoke all on function habbit.accept_task_invite(text,text) from public,anon;
grant execute on function habbit.accept_task_invite(text,text) to authenticated;
create function public.habbit_tasks_accept(p_code text,p_name text) returns uuid language sql security invoker set search_path='' as $$select habbit.accept_task_invite(p_code,p_name)$$;
create function public.habbit_tasks_list() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('me',(select auth.uid()),'connections',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from habbit.task_connections c where c.active),'[]'::jsonb),'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from habbit.shared_tasks t),'[]'::jsonb));
$$;
create function public.habbit_tasks_create(p_connection uuid,p_title text,p_notes text default '',p_due date default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare c habbit.task_connections%rowtype; result uuid;
begin
 select * into c from habbit.task_connections where id=p_connection and sender_id=(select auth.uid()) and active;
 if not found then raise exception 'Connection unavailable' using errcode='42501';end if;
 insert into habbit.shared_tasks(connection_id,sender_id,recipient_id,title,notes,due_date) values(c.id,(select auth.uid()),c.recipient_id,trim(p_title),coalesce(p_notes,''),p_due) returning id into result;
 return result;
end $$;
create function public.habbit_tasks_complete(p_task uuid,p_done boolean) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update habbit.shared_tasks set status=case when p_done then 'done' else 'pending' end where id=p_task and recipient_id=(select auth.uid());
 return found;
end $$;
create function public.habbit_tasks_disconnect(p_connection uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update habbit.task_connections set active=false where id=p_connection and recipient_id=(select auth.uid()) and active;
 return found;
end $$;
revoke all on function public.habbit_tasks_invite(text),public.habbit_tasks_accept(text,text),public.habbit_tasks_list(),public.habbit_tasks_create(uuid,text,text,date),public.habbit_tasks_complete(uuid,boolean),public.habbit_tasks_disconnect(uuid) from public,anon;
grant execute on function public.habbit_tasks_invite(text),public.habbit_tasks_accept(text,text),public.habbit_tasks_list(),public.habbit_tasks_create(uuid,text,text,date),public.habbit_tasks_complete(uuid,boolean),public.habbit_tasks_disconnect(uuid) to authenticated;
