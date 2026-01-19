-- Initial schema for Podgen (Yapdap)
-- Assumes Supabase auth schema is enabled.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  default_speaker_count int not null default 3,
  default_provider text not null default 'vibevoice-fal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text not null,
  category text,
  source_type text not null default 'curated', -- curated | url | prompt | file
  created_at timestamptz not null default now()
);

create unique index if not exists interests_user_label_idx
  on public.interests (user_id, lower(label));

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users on delete set null,
  title text,
  excerpt text,
  audio_url text,
  audio_format text,
  audio_duration_seconds int,
  tts_provider text,
  speaker_count int not null default 3,
  status text not null default 'queued', -- queued | generating | ready | failed
  public boolean not null default false,
  share_slug text unique,
  input_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists episodes_owner_idx
  on public.episodes (owner_user_id);
create index if not exists episodes_public_idx
  on public.episodes (public);

create table if not exists public.episode_sources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes on delete cascade,
  source_type text not null, -- news | url | prompt | file
  title text,
  url text,
  snippet text,
  detailed_summary text,
  created_at timestamptz not null default now()
);

create index if not exists episode_sources_episode_idx
  on public.episode_sources (episode_id);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes on delete cascade,
  status text not null default 'queued', -- queued | running | succeeded | failed
  error text,
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_jobs_status_idx
  on public.generation_jobs (status, run_after);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists episodes_set_updated_at on public.episodes;
create trigger episodes_set_updated_at
before update on public.episodes
for each row execute function public.set_updated_at();

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at
before update on public.generation_jobs
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.interests enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_sources enable row level security;
alter table public.generation_jobs enable row level security;

-- profiles: user owns their row
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- interests: user owns their rows
create policy "interests_select_own"
  on public.interests for select
  using (auth.uid() = user_id);

create policy "interests_insert_own"
  on public.interests for insert
  with check (auth.uid() = user_id);

create policy "interests_update_own"
  on public.interests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "interests_delete_own"
  on public.interests for delete
  using (auth.uid() = user_id);

-- episodes: public episodes readable by anyone, private only by owner
create policy "episodes_select_public_or_owner"
  on public.episodes for select
  using (public = true or auth.uid() = owner_user_id);

create policy "episodes_insert_owner"
  on public.episodes for insert
  with check (auth.uid() = owner_user_id);

create policy "episodes_update_owner"
  on public.episodes for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- episode_sources: readable if episode is public or owned
create policy "episode_sources_select_public_or_owner"
  on public.episode_sources for select
  using (
    exists (
      select 1 from public.episodes e
      where e.id = episode_id and (e.public = true or e.owner_user_id = auth.uid())
    )
  );

create policy "episode_sources_insert_owner"
  on public.episode_sources for insert
  with check (
    exists (
      select 1 from public.episodes e
      where e.id = episode_id and e.owner_user_id = auth.uid()
    )
  );

create policy "episode_sources_update_owner"
  on public.episode_sources for update
  using (
    exists (
      select 1 from public.episodes e
      where e.id = episode_id and e.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.episodes e
      where e.id = episode_id and e.owner_user_id = auth.uid()
    )
  );

-- generation_jobs: default to no access (service role only)
-- no policies added on purpose
