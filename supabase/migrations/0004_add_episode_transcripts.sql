create table if not exists public.episode_transcripts (
  episode_id uuid primary key references public.episodes on delete cascade,
  dialogue_json jsonb not null,
  transcript_text text,
  created_at timestamptz not null default now()
);

alter table public.episode_transcripts enable row level security;

create policy "episode_transcripts_select_public_or_owner"
  on public.episode_transcripts for select
  using (
    exists (
      select 1 from public.episodes e
      where e.id = episode_id and (e.public = true or e.owner_user_id = auth.uid())
    )
  );

create policy "episode_transcripts_insert_owner"
  on public.episode_transcripts for insert
  with check (
    exists (
      select 1 from public.episodes e
      where e.id = episode_id and e.owner_user_id = auth.uid()
    )
  );

create policy "episode_transcripts_update_owner"
  on public.episode_transcripts for update
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
