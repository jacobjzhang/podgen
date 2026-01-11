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

### 2. OpenAI GPT-5.2

**Purpose**: Generate natural podcast dialogue from news summaries

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

### 3. ElevenLabs Text-to-Dialogue

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
| Reactions | `[laughs]`, `[sighs]`, `[gasps]`, `[whispers]`, `[exhales]`, `[gulps]` |
| Emotions | `[excited]`, `[curious]`, `[sarcastic]`, `[nervous]`, `[frustrated]` |
| Delivery | `[thoughtfully]`, `[mischievously]`, `[cheerfully]`, `[flatly]` |
| Cognitive | `[pauses]`, `[hesitates]`, `[stammers]` |

**Tips for Natural Speech**:
- Use ellipses `...` for trailing off or hesitation
- Use em-dashes `—` for interruptions
- CAPS for emphasis on key words
- Combine tags: `[laughs] That's ridiculous!`
- Include narrative context: `"she said excitedly"` influences delivery

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

Rough estimates for a 3-5 minute episode:

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| DataForSEO | ~5 news queries | ~$0.01-0.05 |
| OpenAI GPT-5.2 | ~2k input + 1k output tokens | ~$0.02 |
| ElevenLabs | ~1000 characters | ~$0.03-0.05 |
| **Total** | | **~$0.06-0.12** |

Actual costs vary based on episode length and API pricing changes.
