alter table public.episodes
  add column if not exists news_count int,
  add column if not exists dialogue_turns int;
