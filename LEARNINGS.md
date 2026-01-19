# Podgen - Learnings & Documentation

This document captures API details, implementation decisions, and notes for future development.

## API Integrations

### 1. DataForSEO

**Purpose**: Fetch latest news and trending topics for podcast content

**Documentation**: https://docs.dataforseo.com/v3/

**Authentication**:
- Uses HTTP Basic Auth
- Credentials: `login:password` base64 encoded
- Header: `Authorization: Basic <base64_credentials>`

**Endpoints Used**:

#### Google News SERP
```
POST /v3/serp/google/news/live/advanced
```
- Fetches latest news articles for a keyword
- Returns headlines, snippets, source, URL, timestamp
- Location code `2840` = United States
- Max 100 results per request

Request body:
```json
{
  "keyword": "artificial intelligence",
  "language_code": "en",
  "location_code": 2840,
  "depth": 5
}
```

#### Google Trends Explore
```
POST /v3/keywords_data/google_trends/explore/live
```
- Compare up to 5 keywords
- Returns relative interest (0-100 scale)
- Can filter by time range: `past_hour`, `past_day`, `past_7_days`, `past_month`, `past_year`

**Rate Limits**: 2,000 API calls per minute

**Pricing**: Pay-per-use, see https://dataforseo.com/pricing

**Notes**:
- Results stored for 30 days (standard method)
- Live method provides instant results but no storage
- Consider caching to reduce API costs

---

### 2. OpenAI GPT-5-nano (Article Enrichment)

**Purpose**: Extract detailed summaries from news articles (cheap, fast)

**Model**: `gpt-5-nano`
- Cheapest GPT-5 variant
- $0.05/1M input tokens, $0.40/1M output tokens
- 32K context window (sufficient for article summarization)

**Usage in Pipeline**:
1. Fetch article HTML from news URLs
2. Strip HTML tags, extract text content (first ~8000 chars)
3. GPT-5-nano extracts: summary, key details, quotes, numbers
4. Enriched data passed to dialogue generation

**Prompt Strategy**:
- System prompt asks for JSON output with specific fields
- Focus on "interesting" details that spark discussion
- Extract names, places, specific facts, controversies

**Output Format**:
```json
{
  "summary": "2-3 sentence summary with newsworthy facts",
  "keyDetails": ["specific detail 1", "specific detail 2"],
  "quotes": ["notable quote from article"],
  "numbers": ["$15 billion", "47%", "2024"]
}
```

**Cost Estimate**: ~$0.001-0.005 per article (negligible)

---

### 3. OpenAI GPT-5.2 (Dialogue Generation)

**Purpose**: Generate natural podcast dialogue from enriched news summaries

**Documentation**: https://platform.openai.com/docs/api-reference/chat

**Authentication**:
- Bearer token in Authorization header
- Header: `Authorization: Bearer sk-...`

**Endpoint**:
```
POST https://api.openai.com/v1/chat/completions
```

**Models**:
- `gpt-5.2-chat-latest` - Faster, good for MVP ($1.75/1M input, $14/1M output)
- `gpt-5.2` - Better quality, includes reasoning
- `gpt-5.2-pro` - Highest quality, expensive

**Context/Output Limits**:
- 128,000 token context window
- 16,384 max output tokens

**Key Parameters**:
- `response_format: { type: 'json_object' }` - Ensures valid JSON output
- `max_completion_tokens: 4096` - Enough for ~20-30 dialogue turns
- NOTE: GPT-5.2 does NOT support custom `temperature` - only default (1) allowed

**Prompt Strategy**:
- System prompt defines podcast format, host personas, and audio tag usage
- User prompt contains news summaries with source attribution
- Output format: JSON object with `dialogue` array (not raw array - json_object mode requires top-level object)
- Include ElevenLabs audio tags in dialogue: `[laughs]`, `[sighs]`, `[excited]`, etc.

**Notes**:
- JSON mode requires explicit instruction in prompt to output JSON
- Must use `{"dialogue": [...]}` format, not raw array (json_object constraint)
- GPT-5.2 only supports `max_completion_tokens` (not `max_tokens`)

---

### 4. ElevenLabs Text-to-Dialogue

**Purpose**: Convert dialogue script to natural-sounding audio

**Documentation**: https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert

**Authentication**:
- API key in header
- Header: `xi-api-key: <api_key>`

**Endpoint**:
```
POST https://api.elevenlabs.io/v1/text-to-dialogue
```

**Request Format**:
```json
{
  "inputs": [
    {"text": "[excited] This is amazing!", "voice_id": "B5wiYbiNK3GCUhkdcM4n"},
    {"text": "[sighs] I'm not so sure...", "voice_id": "kPzsL2i3teMYv0FxEYQ6"}
  ],
  "model_id": "eleven_v3"
}
```

**Response**: Binary audio data (MP3 by default)

**Eleven v3 Audio Tags** (for emotional, natural speech):
Use square brackets in text - the model interprets and performs them:

| Category | Tags |
|----------|------|
| Reactions | `[laughs]`, `[sighs]`, `[gasps]`, `[whispers]`, `[exhales]`, `[gulps]`, `[scoffs]`, `[groans]`, `[chuckles]` |
| Emotions | `[excited]`, `[curious]`, `[sarcastic]`, `[nervous]`, `[frustrated]`, `[skeptical]`, `[amused]`, `[incredulous]` |
| Delivery | `[thoughtfully]`, `[mischievously]`, `[cheerfully]`, `[flatly]`, `[deadpan]`, `[sarcastically]`, `[playfully]` |
| Cognitive | `[pauses]`, `[hesitates]`, `[stammers]`, `[catches self]` |
| Turn-taking | `[interrupting]`, `[overlapping]`, `[cuts in]`, `[jumping in]` |
| Pacing | `[fast-paced]`, `[rushed]`, `[drawn out]`, `[pause]`, `[short pause]`, `[long pause]` |

**Tips for Natural Speech**:
- Use ellipses `...` for trailing off or hesitation
- Use em-dashes `—` for interruptions/cut-offs mid-word
- CAPS for emphasis on key words
- Combine tags: `[laughs] That's ridiculous!`
- Layer emotions: `[laughs] No no, that's— [still laughing] that's insane.`

**Filler Words & Disfluencies** (write literally in dialogue text):
- `um`, `uh`, `uhhh` - thinking pauses
- `like`, `you know`, `I mean` - casual fillers
- `so basically`, `right?` - summarizing/checking
- Repeat words for stuttering: `"The the the thing is..."`
- False starts: `"So they're gonna— actually wait, let me back up."`

**Turn Length Variety** (critical for natural feel):
- Single-word turns: `"What."`, `"Huh."`, `"Seriously?"`
- Backchannel: `"Mmhmm"`, `"Yeah"`, `"Right"`, `"Uh-huh"`
- Mix with longer rambling turns for natural rhythm

**Note**: Eleven v3 does NOT support SSML `<break>` tags. Use audio tags and punctuation instead.

**Available Output Formats**:
- `mp3_44100_128` (default)
- `mp3_44100_192`
- `pcm_16000`, `pcm_22050`, `pcm_24000`, `pcm_44100`
- `ulaw_8000`

**Voice Selection**:
- Default voices used in MVP:
  - Alex: `B5wiYbiNK3GCUhkdcM4n` (chris - Deep, Confident, Energetic male)
  - Jordan: `kPzsL2i3teMYv0FxEYQ6` (brittney - Knowledgeable, Professional female)
- List your available voices: `curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/voices`
- Browse voices: https://elevenlabs.io/voice-library
- Custom voices can be created

**Model**: `eleven_v3`
- Latest model with best dialogue quality
- High emotional range and contextual understanding
- Not intended for real-time (use Flash v2.5 for that)

**Notes**:
- Text-to-Dialogue is specifically for multi-speaker content
- Different from conversational AI agents (real-time use case)
- Audio returned as binary - convert to base64 for data URLs
- Consider streaming for long audio (not implemented in MVP)

---

### 5. Dia (Alternative TTS via Replicate)

**Purpose**: Cost-effective alternative to ElevenLabs for TTS (~99% cheaper)

**Documentation**: https://replicate.com/zsxkib/dia

**Hosting**: Replicate (serverless GPU inference)

**Authentication**:
- API token in Replicate client
- Environment variable: `REPLICATE_API_TOKEN`

**Endpoint** (via Replicate SDK):
```javascript
const replicate = new Replicate({ auth: apiToken });
const output = await replicate.run("zsxkib/dia:2119e338ca5c0dacd3def83158d6c80d431f2ac1024146d8cca9220b74385599", { input: {...} });
```

**Request Format**:
```javascript
{
  text: "[S1] Hello from speaker one [S2] Hi from speaker two (laughs)",
  temperature: 1.3,
  cfg_scale: 3,
  max_new_tokens: 3072,
  speed_factor: 1.0
}
```

**Script Format**:
- Multi-speaker dialogue with `[S1]` and `[S2]` tags
- Non-verbal cues use parentheses: `(laughs)`, `(sighs)`, `(whispers)`
- Supports 2 speakers for podcast format

**Key Parameters**:
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `temperature` | 1.8 | 1.0-2.5 | Randomness control |
| `cfg_scale` | 3 | 1-5 | Text adherence strictness |
| `max_new_tokens` | 3072 | 500-4096 | ~86 tokens ≈ 1 second |
| `speed_factor` | 1.0 | 0.5-1.5 | Playback speed |

**Response**: WAV audio file (as stream or URL)

**Pricing**: ~$0.029 per run (~30s generation time)

**Feature Flag**:
```bash
USE_VIBEVOICE=true  # Set to enable Dia instead of ElevenLabs
```

**Trade-offs vs ElevenLabs**:
| Aspect | ElevenLabs | Dia |
|--------|------------|-----|
| Cost (10 min) | ~$1.60-2.70 | ~$0.03 |
| Quality | Excellent | Good |
| Generation time | ~30s | ~30s |
| Audio Tags | Full support | Parentheses format |
| Emotional range | High | Moderate |

**Notes**:
- Dia uses parentheses for actions: `(laughs)` instead of `[laughs]`
- Auto-converts ElevenLabs tags to Dia format in code
- Output is WAV format (converted to base64 data URL)

---

### 6. Dia via fal.ai (Recommended Alternative)

**Purpose**: Cleaner SDK, same Dia model, better developer experience

**Documentation**: https://fal.ai/models/fal-ai/dia-tts

**Hosting**: fal.ai (serverless GPU inference)

**Authentication**:
- API key in fal client configuration
- Environment variable: `FAL_API_KEY`

**Endpoint** (via fal SDK):
```javascript
import { fal } from "@fal-ai/client";
fal.config({ credentials: apiKey });

const result = await fal.subscribe("fal-ai/dia-tts", {
  input: { text: "[S1] Hello! [S2] Hi there! (laughs)" },
  logs: true,
});
```

**Response Format**:
```javascript
{
  audio: {
    url: "https://...",
    content_type: "audio/mpeg"
  }
}
```

**Output**: MP3 audio file (vs WAV from Replicate)

**Pricing**: $0.04 per 1000 characters

**Advantages over Replicate**:
- Cleaner SDK with `fal.subscribe()` pattern
- Built-in queue management and progress updates
- MP3 output (smaller files than WAV)
- Simpler response format (direct URL)

**Tested Limits & Findings**:
- Max input: **10,000 characters** per call
- Output is WAV (not MP3 as docs suggest), ~2MB per ~20s
- No `max_new_tokens` parameter exposed - fal.ai handles internally
- Voice cloning: `ref_audio_url` + `ref_text` for consistency across chunks

**Chunking Strategy for Long Dialogues**:
1. Split script at speaker boundaries, keeping chunks under 10k chars
2. Generate first chunk without reference audio
3. Use first chunk's audio + text as `ref_audio_url`/`ref_text` for subsequent chunks
4. Concatenate WAV files (requires proper PCM extraction, not simple byte append)

**Known Issues**:
- Simple MP3 concatenation doesn't work (files are actually WAV)
- Without reference audio, voices vary between chunks
- Tags like `(laughs)` may not work well - plain text recommended

**Provider Selection**:
```bash
# In .env.local
TTS_PROVIDER=dia-fal      # Use fal.ai
TTS_PROVIDER=dia-replicate # Use Replicate
TTS_PROVIDER=elevenlabs    # Use ElevenLabs
```

---

### 7. VibeVoice (Recommended for Dialogue)

**Purpose**: Native multi-speaker dialogue generation - no chunking or concatenation needed

**Documentation**: https://replicate.com/microsoft/vibevoice

**Why VibeVoice over Dia**:
- Native multi-speaker support (up to 4 speakers in one generation)
- Up to 90 minutes of audio in a single call
- Built-in voice presets with consistent identity
- No chunking/concatenation = no voice consistency issues

**Hosting**: Replicate (also available on fal.ai)

**Authentication**:
- API token via Replicate client
- Environment variable: `REPLICATE_API_TOKEN`

**Script Format**:
```
Speaker 1: First speaker's dialogue here.
Speaker 2: Second speaker responds.
Speaker 1: Back to first speaker.
```

**Voice Presets**:
| Voice | Description |
|-------|-------------|
| `en-Frank_man` | Male voice (used for Alex) |
| `en-Alice_woman` | Female voice (used for Jordan) |
| `en-Carter_man` | Alternative male |
| `en-Maya_woman` | Alternative female |
| `en-Mary_woman_bgm` | Female with background music |

**API Usage** (via Replicate):
```javascript
const prediction = await replicate.predictions.create({
  version: "624421f6fdd4122d0b3ff391ff3449f09db9ad4927167110a4c4b104fa37f728",
  input: {
    script: "Speaker 1: Hello!\nSpeaker 2: Hi there!",
    scale: 1.3,
    speaker_1: "en-Frank_man",
    speaker_2: "en-Alice_woman",
  },
});
```

**Pricing**:
- Replicate: ~$0.10 per run (~$0.001/second)
- fal.ai: $0.04 per minute

**Cold Start**: First run takes ~150s (GPU spin-up), subsequent runs ~30-60s

**Output**: MP3 audio file

**Tested Limits**:
- Successfully generates 5+ minute podcasts in a single call
- Supports up to 90 minutes per call (not fully tested)
- No chunking needed = consistent voices throughout

**Tag Format**: VibeVoice does NOT support any tags!

VibeVoice is **content-aware** - it infers emotion and delivery from the text itself.
Any `[tags]` will be spoken literally, so our code strips them all.

**What Works in VibeVoice** (plain text only):
- Natural filler words: "um", "uh", "like", "you know"
- Stutters written directly: "The the the thing is..."
- CAPS for emphasis: "That's INSANE"
- Cut-offs with dashes: "But that's—"
- Trailing off with ellipses: "I don't know, maybe..."
- Punctuation for pacing: commas, periods, exclamation marks
- Word choice conveys emotion: "Oh wow!" vs "Hmm." vs "Come on."

**What Does NOT Work** (all stripped by our code):
- `[any]` bracketed tags - spoken literally if not removed
- `(parenthetical actions)` like (laughs) - also spoken literally
- No way to force specific emotions - must use natural text

**Provider Selection** (updated):
```bash
# In .env.local
TTS_PROVIDER=vibevoice     # Recommended - native dialogue
TTS_PROVIDER=dia-fal       # Dia via fal.ai (default)
TTS_PROVIDER=dia-replicate # Dia via Replicate
TTS_PROVIDER=elevenlabs    # ElevenLabs (highest quality, most expensive)
```

---

## Implementation Decisions

### 1. Next.js Full-Stack
- **Why**: Single deployment, API routes co-located with frontend
- **Trade-off**: Less separation of concerns, but simpler for MVP

### 2. Static Interest List
- **Why**: Avoid complexity of dynamic autocomplete/search
- **Trade-off**: Limited topics, but curated for quality
- **Future**: Could use DataForSEO trending topics API

### 3. Client-Side Audio Playback
- **Why**: Simpler than server-side storage
- **Trade-off**: Audio must be re-generated each time
- **Future**: Store episodes in blob storage (S3, Vercel Blob)

### 4. Base64 Audio Data URLs
- **Why**: No server storage needed, works immediately
- **Trade-off**: Large response sizes, no streaming
- **Future**: Return audio URL from blob storage instead

### 5. Two Host Personas
- **Why**: Classic podcast format, natural back-and-forth
- **Personas**:
  - Alex: Enthusiastic, uses analogies, asks questions
  - Jordan: Skeptical, fact-based, provides counterpoints

---

## Voice IDs Reference

ElevenLabs pre-made voices suitable for podcasts:

| Voice | ID | Description |
|-------|-----|-------------|
| George | JBFqnCBsd6RMkjVDRZzb | Warm, conversational male |
| Sarah | Aw4FAjKCGjjNkVhN1Xmq | Clear, engaging female |
| Adam | pNInz6obpgDQGcFmaJgB | Deep, authoritative male |
| Rachel | 21m00Tcm4TlvDq8ikWAM | Professional female |
| Josh | TxGEqnHWrfWFTfGW9XjX | Young, energetic male |
| Emily | LcfcDJNUP1GQjkzn1xUU | Friendly, warm female |

---

## Future Enhancements

### Phase 2 - RSS Feed
- Generate unique feed URL per user
- Store episode metadata in database
- Schedule daily/weekly generation
- Use proper audio hosting (not base64)

### Phase 3 - Enhanced Content
- Twitter/X integration for social trends
- Multiple news sources (Reddit, HackerNews)
- Longer episodes with chapters
- Intro/outro music mixing with Web Audio API

### Phase 4 - Personalization
- User accounts and saved preferences
- Custom voice selection
- Playback speed control
- Episode history/library

---

## Troubleshooting

### "Failed to fetch news"
- Check DataForSEO credentials in `.env.local`
- Verify account has API access enabled
- Check rate limits haven't been exceeded

### "Failed to generate dialogue"
- Check OpenAI API key is valid
- Verify model name is correct (`gpt-5.2-chat-latest`)
- Check for rate limiting or quota issues

### "Failed to generate audio"
- Check ElevenLabs API key
- Verify voice IDs are valid
- Check account has sufficient credits

### Build Errors
- Run `npm run build` to check TypeScript errors
- Ensure all env variables are set (even in development)
- Clear `.next` cache if seeing stale errors

---

## Environment Variables

```bash
# Required
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_api_password
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=xi-...

# Optional (defaults provided)
ELEVENLABS_VOICE_1=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_VOICE_2=Aw4FAjKCGjjNkVhN1Xmq
```

---

## Cost Estimates (per episode)

### 10-Minute Episode with ElevenLabs

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| DataForSEO | ~5 news queries | ~$0.02 |
| GPT-5-nano (enrichment) | ~10 articles × ~3k tokens each | ~$0.002 |
| OpenAI GPT-5.2 (dialogue) | ~4k input + 2k output tokens | ~$0.08 |
| ElevenLabs | ~10,000 characters | ~$1.60-2.70 |
| **Total** | | **~$1.70-2.80** |

### 10-Minute Episode with Dia (Alternative)

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| DataForSEO | ~5 news queries | ~$0.02 |
| GPT-5-nano (enrichment) | ~10 articles × ~3k tokens each | ~$0.002 |
| OpenAI GPT-5.2 (dialogue) | ~4k input + 2k output tokens | ~$0.08 |
| Dia (Replicate) | ~10,000 characters | ~$0.03 |
| **Total** | | **~$0.13** |

**Cost Savings**: Dia reduces per-episode cost by ~95%.

Actual costs vary based on episode length and API pricing changes.
