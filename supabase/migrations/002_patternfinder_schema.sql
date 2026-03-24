-- PatternFinder tables (profiles table and trigger already exist from GoldenList)

-- Events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  color text not null default '#06B6D4',
  created_at timestamptz default now() not null
);

alter table public.events enable row level security;

create policy "Users can view own events" on public.events
  for select using (auth.uid() = user_id);
create policy "Users can insert own events" on public.events
  for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on public.events
  for update using (auth.uid() = user_id);
create policy "Users can delete own events" on public.events
  for delete using (auth.uid() = user_id);

-- Shared events table
create table if not exists public.shared_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  shared_with_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(event_id, shared_with_user_id)
);

alter table public.shared_events enable row level security;

-- Shared events policy on events table
create policy "Users can view shared events" on public.events
  for select using (
    id in (
      select event_id from public.shared_events
      where shared_with_user_id = auth.uid()
    )
  );

create policy "Event owners can share" on public.shared_events
  for insert with check (
    event_id in (
      select id from public.events where user_id = auth.uid()
    )
  );
create policy "Users can view shares involving them" on public.shared_events
  for select using (
    shared_with_user_id = auth.uid() or
    event_id in (select id from public.events where user_id = auth.uid())
  );
create policy "Event owners can unshare" on public.shared_events
  for delete using (
    event_id in (select id from public.events where user_id = auth.uid())
  );

-- Occurrences table
create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  logged_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null
);

alter table public.occurrences enable row level security;

create policy "Users can log occurrences for own or shared events" on public.occurrences
  for insert with check (
    auth.uid() = logged_by and (
      event_id in (select id from public.events where user_id = auth.uid()) or
      event_id in (select event_id from public.shared_events where shared_with_user_id = auth.uid())
    )
  );
create policy "Users can view occurrences for own or shared events" on public.occurrences
  for select using (
    event_id in (select id from public.events where user_id = auth.uid()) or
    event_id in (select event_id from public.shared_events where shared_with_user_id = auth.uid())
  );
create policy "Users can delete own logged occurrences" on public.occurrences
  for delete using (auth.uid() = logged_by);

-- Indexes
create index idx_events_user_id on public.events(user_id);
create index idx_occurrences_event_id on public.occurrences(event_id);
create index idx_occurrences_created_at on public.occurrences(created_at);
create index idx_shared_events_shared_with on public.shared_events(shared_with_user_id);
