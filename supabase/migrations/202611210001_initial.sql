begin;
create table public.users (id uuid primary key references auth.users(id) on delete cascade);
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
create policy own_profile on public.users for select to authenticated using (id = (select auth.uid()));

create table public.clients (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references public.users(id),
 name text not null check (length(trim(name)) between 1 and 200), notes text not null default '',
 archived boolean not null default false, created_at timestamptz not null default now(), unique(owner_id,id)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references public.users(id),
 client_id uuid not null, name text not null check (length(trim(name)) between 1 and 200),
 description text not null default '', role text not null default '', notes text not null default '',
 technologies text not null default '', accomplishments text not null default '',
 start_date date, target_date date, end_date date, created_at timestamptz not null default now(),
 status text not null default 'Not Started' check (status in ('Not Started','Active','On Hold','At Risk','Completed')),
 priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
 check (target_date >= start_date), check (end_date >= start_date),
 foreign key(owner_id,client_id) references public.clients(owner_id,id) on delete cascade,
 unique(owner_id,client_id,id)
);
create table public.action_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references public.users(id),
 client_id uuid, project_id uuid, title text not null check (length(trim(title)) between 1 and 200),
 description text not null default '', notes text not null default '', due_date date,
 priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
 status text not null default 'Not Started' check (status in ('Not Started','In Progress','Waiting on Client','Blocked','Completed','Cancelled')),
 created_at timestamptz not null default now(), completed_at timestamptz, archived boolean not null default false,
 check (project_id is null or client_id is not null),
 foreign key(owner_id,client_id) references public.clients(owner_id,id) on delete set null (client_id),
 foreign key(owner_id,client_id,project_id) references public.projects(owner_id,client_id,id) on delete set null (project_id)
);
create table public.activity_history (
 id bigint generated always as identity primary key, owner_id uuid not null references public.users(id),
 entity text not null, entity_id uuid not null, label text not null, operation text not null,
 created_at timestamptz not null default now()
);
create index action_due on public.action_items(owner_id,due_date);
create index projects_client on public.projects(owner_id,client_id);
create index actions_client_project on public.action_items(owner_id,client_id,project_id);
create index activity_recent on public.activity_history(owner_id,created_at desc);

do $$ declare t text;
begin
 foreach t in array array['clients','projects','action_items','activity_history'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_select on public.%I for select to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.users where id = (select auth.uid())))',t);
  if t <> 'activity_history' then
   execute format('grant insert, update, delete on public.%I to authenticated',t);
   execute format('create policy owner_write on public.%I for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.users where id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.users where id = (select auth.uid())))',t);
  end if;
 end loop;
end $$;

create function public.set_completion() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op = 'UPDATE' then
  new.created_at := old.created_at;
  if new.status = 'Completed' and old.status = 'Completed' then
   new.completed_at := old.completed_at;
   return new;
  end if;
 else
  new.created_at := now();
 end if;
 new.completed_at := case when new.status = 'Completed' then now() else null end;
 return new;
end $$;
create trigger action_completion before insert or update on public.action_items for each row execute function public.set_completion();

create function public.detach_client_actions() returns trigger language plpgsql set search_path = '' as $$
begin
 update public.action_items set client_id = null, project_id = null
 where owner_id = old.owner_id and client_id = old.id;
 return old;
end $$;
create trigger detach_client_actions before delete on public.clients for each row execute function public.detach_client_actions();
create function public.record_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
 payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.activity_history(owner_id,entity,entity_id,label,operation)
 values ((payload->>'owner_id')::uuid,tg_table_name,(payload->>'id')::uuid,
         coalesce(payload->>'name',payload->>'title'),lower(tg_op));
 return null;
end $$;
revoke all on function public.record_activity() from public, anon, authenticated;
create trigger client_activity after insert or update or delete on public.clients for each row execute function public.record_activity();
create trigger project_activity after insert or update or delete on public.projects for each row execute function public.record_activity();
create trigger action_activity after insert or update or delete on public.action_items for each row execute function public.record_activity();

create function public.create_client(client_name text, client_notes text, historical boolean, first_project jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare client_key uuid;
begin
 insert into public.clients(name,notes,archived) values (client_name,client_notes,historical) returning id into client_key;
 if first_project is not null then
  insert into public.projects(client_id,name,description,role,notes,technologies,accomplishments,status,priority,start_date,target_date,end_date)
  select client_key,p.name,p.description,p.role,p.notes,p.technologies,p.accomplishments,p.status,p.priority,p.start_date,p.target_date,p.end_date
  from jsonb_to_record(first_project) as p(name text,description text,role text,notes text,technologies text,accomplishments text,status text,priority text,start_date date,target_date date,end_date date);
 end if;
 return client_key;
end $$;
revoke all on function public.create_client(text,text,boolean,jsonb) from public, anon;
grant execute on function public.create_client(text,text,boolean,jsonb) to authenticated;
commit;
