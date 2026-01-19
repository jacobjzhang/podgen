# Podgen Agent Notes

Quick guidance for contributors and coding agents working in this repo.

## High-Level Flow
1. Fetch news for selected interests (DataForSEO).
2. Enrich articles (GPT-5-nano) unless the source is a user URL.
3. Generate dialogue (GPT-5.2).
4. Generate audio via TTS provider.

## Topic Inputs
- Users can pick from the curated list or paste a URL/prompt.
- URLs: extract raw text (up to ~16k chars) and pass to dialogue generation (skip GPT-5-nano summary).
- Prompts: use the prompt text as-is.

## Speakers
- Supported speaker count: 1-4.
- 3-4 speakers require VibeVoice (`TTS_PROVIDER=vibevoice` or `vibevoice-fal`).
- Speaker order maps to: Alex, Jordan, Casey, Riley.

## TTS Providers
- `vibevoice` (Replicate 1.5B): `[S1] ... [S2] ...` format.
- `vibevoice-fal` (fal.ai 1.5B): `Speaker 0: ...` format.
- `dia-fal` / `dia-replicate`: can truncate or skip lines for long scripts.
- VibeVoice does not support tags; all tags are stripped before TTS.

## Where to Look
- API entry: `app/api/generate/route.ts`
- Dialogue: `lib/openai.ts`, `lib/prompts.ts`
- Enrichment: `lib/article-enricher.ts`
- TTS routing: `lib/tts.ts`
- Providers: `lib/vibevoice.ts`, `lib/vibevoice-fal.ts`, `lib/dia-fal.ts`, `lib/dia.ts`

## Development
```bash
npm run dev
npm run lint
npm run build
```
