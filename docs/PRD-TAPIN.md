# PRD: TapIn

**Codename:** TapIn
**Status:** Draft
**Author:** Claude
**Last Updated:** 2025-01-24

---

## One-Liner

Type any topic. Start listening to an infinite AI-generated radio stream about it in under 15 seconds.

---

## Problem

1. **Podcasts are pre-recorded** — Can't get a podcast about something that happened today
2. **Search results are text** — Can't read while driving/exercising/working
3. **Current Podgen is batch** — 2-3 minute wait, fixed-length output
4. **Radio is generic** — Can't say "give me 10 minutes on Chris Camillo"

**User job-to-be-done:** "I want to learn about [X] right now, hands-free, without waiting."

---

## Solution

A streaming audio interface where:
1. User types a topic (or speaks it)
2. System immediately starts generating
3. Audio begins playing in <15 seconds
4. Stream continues indefinitely until user stops
5. Feels like tuning into a radio station that's always been talking about your topic

---

## Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Time to first audio | <15 sec | Core promise |
| Buffer underruns | <2% of sessions | Smooth experience |
| Average listen duration | >3 min | Engagement |
| Return usage (7-day) | >30% | Retention |
| Share rate | >5% | Growth |

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTRY                                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  What do you want to hear about?                        │   │
│  │                                                         │   │
│  │  [chris camillo________________________] [TapIn 🎧]     │   │
│  │                                                         │   │
│  │  Try: "OpenAI drama" · "Bitcoin today" · "Taylor Swift" │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User hits enter / clicks TapIn
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LOADING (8-15 seconds)                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │            ◉ ◉ ◉  Tuning in to "chris camillo"          │   │
│  │                                                         │   │
│  │            ✓ Found 8 recent articles                    │   │
│  │            ✓ Found 5 related sources                    │   │
│  │            ● Preparing stream...                        │   │
│  │                                                         │   │
│  │            Starting in 4s...                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ First audio chunk ready
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PLAYING                                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │   LIVE   chris camillo                          2:34    │   │
│  │                                                         │   │
│  │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                         │   │
│  │        [⏪ 15s]    [ ⏸ PAUSE ]    [15s ⏩]              │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────────┐   │   │
│  │   │ SOURCES                                         │   │   │
│  │   │ • Bloomberg: "Camillo's Social Arb Fund..."     │   │   │
│  │   │ • Forbes: "How One Trader Uses TikTok..."       │   │   │
│  │   │ • YouTube: "Chris Camillo Interview..."         │   │   │
│  │   └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │   [Share 🔗]  [Save Episode 💾]  [New Topic ✨]         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TapIn Service                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SESSION MANAGER                        │  │
│  │  • Creates/destroys sessions                              │  │
│  │  • Tracks active streams                                  │  │
│  │  • Enforces limits (max concurrent, max duration)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATOR                           │  │
│  │                                                           │  │
│  │   [Content Fetcher] ──▶ [Dialogue Gen] ──▶ [Audio Gen]   │  │
│  │         │                     │                  │        │  │
│  │         ▼                     ▼                  ▼        │  │
│  │   ┌─────────────────────────────────────────────────┐    │  │
│  │   │              CHUNK BUFFER                       │    │  │
│  │   │   [0: playing] [1: ready] [2: generating]       │    │  │
│  │   └─────────────────────────────────────────────────┘    │  │
│  │                              │                            │  │
│  └──────────────────────────────│────────────────────────────┘  │
│                                 │                               │
│                                 │ SSE: chunk_ready events       │
│                                 ▼                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   SSE       │    │   Audio     │    │   Gapless   │         │
│  │   Listener  │───▶│   Queue     │───▶│   Player    │──▶ 🔊   │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

#### `POST /api/tapin/start`

Start a new streaming session.

**Request:**
```json
{
  "topic": "chris camillo",
  "speakerCount": 2
}
```

**Response:**
```json
{
  "sessionId": "tap_abc123xyz",
  "estimatedStartTime": 12
}
```

#### `GET /api/tapin/[sessionId]/events`

Server-Sent Events stream for real-time updates.

**Events:**

```typescript
// Progress updates during loading
{ "type": "status", "phase": "fetching", "message": "Finding sources..." }
{ "type": "status", "phase": "sources_ready", "count": 8 }
{ "type": "status", "phase": "generating", "message": "Preparing stream..." }

// Sources for display
{
  "type": "sources",
  "data": [
    { "title": "...", "url": "...", "source": "Bloomberg" }
  ]
}

// Audio chunk ready
{
  "type": "chunk_ready",
  "chunkIndex": 0,
  "audioUrl": "/api/tapin/tap_abc123xyz/audio/0",
  "duration": 34.5,
  "dialogue": [
    { "speaker": "alex", "text": "..." },
    { "speaker": "jordan", "text": "..." }
  ]
}

// Stream complete (hit max duration or content exhausted)
{ "type": "complete", "totalDuration": 342 }

// Error
{ "type": "error", "message": "Failed to generate audio", "fatal": true }
```

#### `GET /api/tapin/[sessionId]/audio/[chunkIndex]`

Returns audio file for a specific chunk.

**Response:** `audio/wav` or `audio/mpeg` binary

#### `POST /api/tapin/[sessionId]/stop`

Gracefully stop generation (saves resources).

#### `POST /api/tapin/[sessionId]/extend`

Request more content (if user wants to keep listening).

---

### Data Models

#### Session State

```typescript
interface TapInSession {
  id: string;                    // tap_abc123xyz
  topic: string;
  status: 'initializing' | 'buffering' | 'streaming' | 'complete' | 'error';
  createdAt: Date;

  // Configuration
  speakerCount: 2 | 3 | 4;
  maxChunks: number;             // Cost control, default 20 (~10 min)

  // Content
  sources: NewsItem[];

  // Generation state
  chunks: ChunkState[];
  conversationContext: string;   // Summary for LLM continuity

  // Metrics
  totalDuration: number;
  chunksGenerated: number;
  chunksPlayed: number;
}

interface ChunkState {
  index: number;
  status: 'pending' | 'generating_dialogue' | 'generating_audio' | 'ready' | 'error';
  dialogue: DialogueTurn[] | null;
  audioUrl: string | null;
  duration: number | null;
  generatedAt: Date | null;
}
```

#### Storage

**Phase 1 (MVP):** In-memory Map with TTL
```typescript
const sessions = new Map<string, TapInSession>();
// Cleanup sessions after 30 min inactive
```

**Phase 2:** Redis for multi-instance support
```typescript
// redis key: tapin:session:{sessionId}
// redis key: tapin:audio:{sessionId}:{chunkIndex}
```

---

### Chunk Generation Pipeline

#### Dialogue Chunking

Each chunk = 4-5 dialogue turns ≈ 30-45 seconds of audio.

```typescript
async function generateDialogueChunk(
  session: TapInSession,
  chunkIndex: number
): Promise<DialogueTurn[]> {

  const systemPrompt = `You are continuing a podcast conversation about "${session.topic}".

${chunkIndex === 0 ? 'Start with a brief intro.' : 'Continue naturally from the previous exchange.'}

Previous context:
${session.conversationContext || 'This is the beginning of the conversation.'}

Generate exactly 4-5 dialogue turns. Be informative but conversational.
End at a natural pause point (not mid-thought).`;

  const sources = session.sources
    .slice(0, 6)
    .map(s => `- ${s.title}: ${s.snippet}`)
    .join('\n');

  // Generate dialogue
  const dialogue = await generateDialogue(sources, systemPrompt, session.speakerCount);

  // Update context for next chunk
  session.conversationContext = summarizeForContext(
    session.conversationContext,
    dialogue
  );

  return dialogue;
}
```

#### Audio Generation

Use existing TTS infrastructure but per-chunk:

```typescript
async function generateAudioChunk(
  session: TapInSession,
  dialogue: DialogueTurn[]
): Promise<{ url: string; duration: number }> {

  const audioDataUrl = await generateAudioDataUrl(dialogue);

  // Store in session or temp storage
  const chunkUrl = `/api/tapin/${session.id}/audio/${session.chunks.length}`;

  // Calculate duration from audio
  const duration = calculateAudioDuration(audioDataUrl);

  return { url: chunkUrl, duration };
}
```

#### Buffer Management

```typescript
const BUFFER_CONFIG = {
  initialChunks: 1,      // Wait for 1 chunk before playing
  targetAhead: 2,        // Try to stay 2 chunks ahead
  maxAhead: 4,           // Don't generate more than 4 ahead
  maxTotal: 20,          // Max chunks per session (~10 min)
};

async function manageBuffer(session: TapInSession): Promise<void> {
  const playingIndex = session.chunksPlayed;
  const readyCount = session.chunks.filter(c => c.status === 'ready').length;
  const aheadCount = readyCount - playingIndex;

  // Check if we should generate more
  if (aheadCount < BUFFER_CONFIG.targetAhead &&
      session.chunks.length < BUFFER_CONFIG.maxTotal) {

    const nextIndex = session.chunks.length;
    session.chunks.push({ index: nextIndex, status: 'pending', ... });

    // Generate in background
    generateChunk(session, nextIndex);
  }
}
```

---

### Client Implementation

#### State Machine

```typescript
type TapInState =
  | { status: 'idle' }
  | { status: 'connecting', topic: string }
  | { status: 'loading', topic: string, phase: string, sources: NewsItem[] }
  | { status: 'playing', topic: string, sources: NewsItem[], currentTime: number }
  | { status: 'buffering', topic: string }  // Ran out of chunks
  | { status: 'complete', topic: string, totalDuration: number }
  | { status: 'error', message: string };
```

#### Audio Queue

```typescript
class GaplessAudioQueue {
  private queue: string[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;

  addChunk(url: string) {
    this.queue.push(url);
    this.prepareNext();
  }

  private prepareNext() {
    if (this.nextAudio || this.queue.length === 0) return;

    // Preload next chunk
    this.nextAudio = new Audio(this.queue[0]);
    this.nextAudio.preload = 'auto';
  }

  private onCurrentEnded = () => {
    if (this.nextAudio) {
      // Seamless transition
      this.currentAudio = this.nextAudio;
      this.currentAudio.play();
      this.queue.shift();
      this.nextAudio = null;
      this.prepareNext();
    } else {
      // Buffer underrun
      this.onBufferEmpty?.();
    }
  };
}
```

#### SSE Connection

```typescript
function connectToSession(sessionId: string) {
  const eventSource = new EventSource(`/api/tapin/${sessionId}/events`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'status':
        updateLoadingUI(data.phase, data.message);
        break;

      case 'sources':
        setSources(data.data);
        break;

      case 'chunk_ready':
        audioQueue.addChunk(data.audioUrl);
        if (state.status === 'loading' && data.chunkIndex === 0) {
          startPlayback();
        }
        break;

      case 'complete':
        markComplete(data.totalDuration);
        break;

      case 'error':
        if (data.fatal) {
          showError(data.message);
          eventSource.close();
        }
        break;
    }
  };
}
```

---

### Timing Targets

| Phase | Target | Measured From |
|-------|--------|---------------|
| Source fetch | 2-3 sec | Session start |
| First dialogue chunk | 3-5 sec | Sources ready |
| First audio chunk | 15-25 sec | Dialogue ready |
| **Time to first audio** | **<15 sec** | User hits enter |
| Chunk generation (ongoing) | <30 sec | Previous chunk |
| Buffer refill | Stay 2 ahead | Continuous |

---

### Cost Controls

| Control | Implementation |
|---------|----------------|
| Max session duration | 20 chunks ≈ 10 min of audio |
| Concurrent sessions | 10 per IP (rate limit) |
| Session timeout | Kill after 5 min idle |
| TTS budget | Track per-session, alert at threshold |
| Source fetches | Cache aggressively (5 min TTL) |

**Estimated cost per session (10 min):**
- Source fetches: $0.02 (DataForSEO)
- Dialogue generation: $0.05 (GPT-5.2, ~4k tokens)
- Audio generation: $0.40 (VibeVoice-fal, 10 min)
- **Total: ~$0.50 per 10-min session**

---

### Error Handling

| Error | User Impact | Recovery |
|-------|-------------|----------|
| Source fetch fails | "Couldn't find sources" | Retry with broader query |
| Dialogue gen fails | "Generation error" | Retry chunk, fallback to simpler prompt |
| Audio gen fails | "Audio error" | Retry chunk, skip if repeated failure |
| Buffer underrun | "Buffering..." | Pause, wait for next chunk |
| Session timeout | "Session ended" | Offer to start new session |
| SSE disconnect | Silent reconnect | Auto-reconnect, resume from last chunk |

---

### File Structure

```
app/
  tapin/
    page.tsx                    # Main TapIn UI
    components/
      TopicInput.tsx            # Search box with suggestions
      LoadingState.tsx          # Progress indicators
      Player.tsx                # Audio player with controls
      SourceList.tsx            # Scrolling source cards

api/
  tapin/
    start/route.ts              # POST - Create session
    [sessionId]/
      events/route.ts           # GET - SSE stream
      audio/
        [chunkIndex]/route.ts   # GET - Audio file
      stop/route.ts             # POST - End session
      extend/route.ts           # POST - Request more

lib/
  tapin/
    session-manager.ts          # Session CRUD + cleanup
    orchestrator.ts             # Chunk generation pipeline
    chunk-generator.ts          # Dialogue + audio per chunk
    buffer-manager.ts           # Buffer level logic
    context-manager.ts          # Conversation continuity

hooks/
  useTapIn.ts                   # Client state machine + SSE
  useGaplessAudio.ts            # Audio queue management
```

---

### Phases

#### Phase 1: MVP (1-2 weeks)

- [ ] Basic `/tapin` page with topic input
- [ ] Session creation + SSE streaming
- [ ] Chunked dialogue generation with context
- [ ] Chunked audio generation
- [ ] Simple audio queue (gapless)
- [ ] Loading states with progress
- [ ] Source display
- [ ] Play/pause controls
- [ ] Error handling

**Ship when:** User can type topic → hear audio in <20 sec → listen for 5+ min

#### Phase 2: Polish (1 week)

- [ ] Audio crossfade between chunks
- [ ] Skip forward/back 15s
- [ ] Waveform visualization
- [ ] "Keep going" button (extend session)
- [ ] Share session link
- [ ] Save as episode (persist to existing system)
- [ ] Keyboard shortcuts (space = pause)

#### Phase 3: Features (ongoing)

- [ ] Voice input ("Hey, tell me about...")
- [ ] Topic suggestions based on trending
- [ ] Follow-up questions mid-stream
- [ ] Multiple concurrent topics (playlist)
- [ ] Background audio (PWA)
- [ ] Personalization (remember preferences)

---

### Open Questions

1. **Persistence:** Should we save TapIn sessions as regular episodes?
2. **Interruption:** Can user ask follow-up questions mid-stream?
3. **Monetization:** Free tier limits? (e.g., 3 sessions/day, 5 min max)
4. **Analytics:** What events to track for understanding usage?
5. **Mobile:** Native app needed for background audio?

---

### Non-Goals (for now)

- Real-time voice conversation (too complex)
- Multi-user listening (social radio)
- Live event coverage (requires real-time data)
- Music/sound effects (licensing hell)
- Offline playback (PWA can handle later)

---

## Appendix: Competitive Analysis

| Product | Strengths | Weaknesses | TapIn Advantage |
|---------|-----------|------------|-----------------|
| **Podcasts** | Deep content, trusted hosts | Pre-recorded, can't customize | On-demand, any topic |
| **NotebookLM** | Good audio quality | Must upload docs, no live data | Auto-fetches sources |
| **News apps** | Real-time, comprehensive | Text-only, no audio | Audio-first |
| **Radio** | Live, background listening | Generic, can't choose topic | Personalized |
| **TTS readers** | Any text to audio | Single voice, robotic | Multi-voice conversation |

---

*"Tap in and tune out everything else."*
