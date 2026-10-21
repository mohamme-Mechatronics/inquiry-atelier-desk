create type public.app_role as enum ('admin','staff');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id,role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_team(_user_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.team_members (user_id uuid primary key references auth.users(id) on delete cascade, email text, created_at timestamptz not null default now());
grant select on public.team_members to authenticated; grant all on public.team_members to service_role;
alter table public.team_members enable row level security;
create policy "admin sees members" on public.team_members for select to authenticated using (public.has_role(auth.uid(),'admin') or user_id=auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.team_members(user_id,email) values (new.id,new.email);
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id,role) values (new.id,'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.customers (phone text primary key, name text, city text, system text, stage text, status text not null default 'new', bot_paused boolean not null default false, last_message text, last_at timestamptz not null default now(), created_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), phone text not null, direction text not null default 'customer', kind text not null default 'text', text text, media_id text, mime text, file_name text, stage text, created_at timestamptz not null default now());
create index on public.messages(phone, created_at);
create table public.orders (id uuid primary key default gen_random_uuid(), phone text not null, name text, city text, invoice_no text, amount text, method text, details text, status text not null default 'new', created_at timestamptz not null default now());
create table public.tickets (id uuid primary key default gen_random_uuid(), ticket_no text not null unique, phone text not null, name text, city text, device text, issue_type text, description text, media_id text, media_type text, status text not null default 'open', created_at timestamptz not null default now());
create sequence public.ticket_seq start 1000;
create table public.button_locks (context_id text primary key, phone text, choice text, created_at timestamptz not null default now());
create table public.catalog_items (code text primary key, name text not null, unit text, price numeric, specs jsonb not null default '[]', updated_at timestamptz not null default now());

do $$ declare t text; begin
 foreach t in array array['customers','messages','orders','tickets','catalog_items'] loop
  execute format('grant select,insert,update,delete on public.%I to authenticated; grant all on public.%I to service_role; alter table public.%I enable row level security; create policy "team access" on public.%I for all to authenticated using (public.is_team(auth.uid())) with check (public.is_team(auth.uid()));',t,t,t,t);
 end loop; end $$;
grant all on public.button_locks to service_role; alter table public.button_locks enable row level security;
grant usage on sequence public.ticket_seq to service_role;
create or replace function public.next_ticket_no() returns text language sql security definer set search_path=public as $$ select 'TMK-SUP-'||nextval('public.ticket_seq')::text $$;
revoke execute on function public.next_ticket_no() from public, anon, authenticated;
grant execute on function public.next_ticket_no() to service_role;