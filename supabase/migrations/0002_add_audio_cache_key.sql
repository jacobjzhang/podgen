alter table public.episodes
  add column if not exists audio_cache_key text;

create unique index if not exists episodes_audio_cache_key_idx
  on public.episodes (audio_cache_key);
