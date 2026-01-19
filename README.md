# Podgen

Generate podcast-style dialogue and audio from topics, URLs, or free-form prompts.

## Features
- Topic search with a curated list, plus custom URL or prompt input.
- 1-4 speakers (3-4 speakers require VibeVoice).
- Multiple TTS providers: VibeVoice (fal/replicate), Dia (fal/replicate), ElevenLabs.
- Caching for news, dialogue, and audio to reduce cost.

## Quickstart
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in keys in `.env.local`.
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Usage Notes
### Topics, URLs, and Prompts
- The search bar accepts:
  - A topic from the list.
  - A URL (we extract raw text).
  - A free-form prompt (used as-is).
- URLs skip GPT-5-nano summarization. We pass raw extracted text (up to ~16k chars) directly into dialogue generation. If extraction fails, we fall back to the snippet.

### Speaker Count
- Choose 1-4 speakers in the UI.
- 3-4 speakers require `TTS_PROVIDER=vibevoice` or `TTS_PROVIDER=vibevoice-fal`.
- Speakers map to Alex, Jordan, Casey, Riley in that order.

### TTS Providers
Set `TTS_PROVIDER` in `.env.local`:
- `vibevoice` (Replicate, 1.5B)
- `vibevoice-fal` (fal.ai, 1.5B)
- `dia-fal` (default if unset)
- `dia-replicate`
- `elevenlabs`

Note: VibeVoice does not support tags like `[laughs]` or `(laughs)`; all tags are stripped before generation.

## Environment Variables
Required:
- `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- `OPENAI_API_KEY`

Provider-specific:
- `FAL_API_KEY` (dia-fal, vibevoice-fal)
- `REPLICATE_API_TOKEN` (dia-replicate, vibevoice)
- `ELEVENLABS_API_KEY` (elevenlabs)

Optional speaker presets:
- `VIBEVOICE_SPEAKER_0_PRESET`..`VIBEVOICE_SPEAKER_3_PRESET` (fal)
- `VIBEVOICE_SPEAKER_0_PRESET_REPLICATE`..`_3_` (replicate)

## Development
```bash
npm run dev
npm run lint
npm run build
```
