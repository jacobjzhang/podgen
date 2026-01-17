// Podcast host personas and dialogue generation prompts
// Supports both ElevenLabs and VibeVoice TTS providers

// Debug: limit dialogue turns for faster iteration (0 = default 35-50)
const DEBUG_MAX_TURNS = process.env.DEBUG_MAX_TURNS ? parseInt(process.env.DEBUG_MAX_TURNS) : 0;

// Log at module load time
console.log(`[Prompts] DEBUG_MAX_TURNS = ${DEBUG_MAX_TURNS} (env: ${process.env.DEBUG_MAX_TURNS})`);

export const PODCAST_NAME = "The Daily Pulse";

export const HOST_PERSONAS = {
  alex: {
    name: "Alex",
    role: "The Enthusiast",
    personality: `Genuinely curious tech optimist who gets excited about implications and possibilities.
    Asks probing "what if" questions. Uses analogies to make complex topics accessible.
    Sometimes gets carried away with excitement and needs to be grounded.
    Laughs easily, expresses wonder, occasionally interrupts with realizations.`,
  },
  jordan: {
    name: "Jordan",
    role: "The Skeptic",
    personality: `Sharp, analytical journalist who plays devil's advocate. Grounds discussions in reality.
    Asks "but what about..." and "who benefits?" Questions hype and looks for the real story.
    Dry humor, occasional sighs at overblown claims. Respects good arguments but pushes back.
    More measured emotionally but genuinely engaged when something is interesting.`,
  },
};

// ============================================================================
// ELEVENLABS SYSTEM PROMPT (uses [tag] format)
// ============================================================================
const ELEVENLABS_SYSTEM_PROMPT = `You are writing a script for "${PODCAST_NAME}", a conversational news podcast where two hosts have genuine, unscripted-feeling discussions.

THE HOSTS:
- ALEX (${HOST_PERSONAS.alex.role}): ${HOST_PERSONAS.alex.personality}
- JORDAN (${HOST_PERSONAS.jordan.role}): ${HOST_PERSONAS.jordan.personality}

=== MAKE IT SOUND HUMAN - THIS IS CRITICAL ===

1. INTERRUPTIONS & OVERLAPPING (use these ElevenLabs v3 audio tags):
   [interrupting] - cutting someone off mid-thought
   [overlapping] - starting while the other person finishes
   [cuts in] - quick interjection
   [jumping in] - eager to add something

   Examples:
   ALEX: "So the whole thing is basically—"
   JORDAN: "[interrupting] Wait wait wait, hold on."

   JORDAN: "...and that's why I think it's overblown."
   ALEX: "[overlapping] See but that's EXACTLY what they said about—"

2. FILLER WORDS & DISFLUENCIES (write these literally in the text):
   "um", "uh", "uhhh", "like", "I mean", "you know", "so basically", "right?"

   Examples:
   "So it's, um, it's basically like a... a giant money pit?"
   "I mean, yeah, but like... [hesitates] I don't know."
   "And they're just, you know, throwing money at it, right?"

3. STUTTERS, FALSE STARTS & REDOS:
   Use [stammers] tag. Start thoughts, abandon them, restart. Repeat words.

   Examples:
   "[stammers] It's not—I mean, it's not JUST about the money, it's—"
   "The the the thing is, this isn't new."
   "So they're gonna— actually no wait, let me back up."
   "That's ridic— [catches self] okay, maybe not ridiculous, but close."

4. VARYING PACE (audio tags):
   [fast-paced] - excited rapid speech
   [rushed] - trying to get words out quickly
   [drawn out] - slow, deliberate emphasis
   [pause], [short pause], [long pause] - beats between thoughts

   Examples:
   "[fast-paced] And then they announced ANOTHER acquisition and I can't even keep track—"
   "[drawn out] Fifteeeeen... billion... dollars."
   "And the CEO said— [long pause] —he said they're not done yet."

5. EMOTIONAL RANGE (layer these throughout):
   Reactions: [laughs], [sighs], [gasps], [scoffs], [exhales], [groans], [chuckles]
   States: [excited], [frustrated], [nervous], [skeptical], [amused], [incredulous]
   Delivery: [deadpan], [sarcastically], [cheerfully], [flatly], [playfully]

   Layer emotions:
   "[laughs] No no no, that's— [still laughing] that's insane."
   "[sighs] Look... [frustrated] I'm just tired of these announcements."
   "[gasps] Wait. [excited] Wait wait wait, does this mean—"

6. SENTENCE & TURN LENGTH VARIETY - THIS IS KEY:
   - Some turns are ONE word: "What." / "Seriously?" / "Huh." / "No."
   - Some are run-on excited rambles
   - Let one person dominate for 2-3 turns, then flip
   - Include quick back-and-forth volleys

   Examples of turn variety:
   {"speaker": "jordan", "text": "[scoffs]"},
   {"speaker": "alex", "text": "What?"},
   {"speaker": "jordan", "text": "Nothing, it's just— [sighs] okay, so basically they're doing the EXACT same thing as last time."},
   {"speaker": "alex", "text": "Mmm."},
   {"speaker": "jordan", "text": "And everyone's acting like it's revolutionary."},
   {"speaker": "alex", "text": "[fast-paced] Okay but but but here's the thing, here's the thing— what if this time it actually IS different? Because look, the the the scale is completely—"},
   {"speaker": "jordan", "text": "[interrupting] The scale is always 'completely different.'"}

7. CUT-OFFS & TRAILING OFF:
   - Dashes (—) for interrupted speech: "But the thing is—"
   - Ellipses (...) for trailing off: "I don't know, maybe..."
   - Combine: "[hesitates] It's just... I don't know..."

8. BACKCHANNEL RESPONSES (short acknowledgment turns):
   "Mmhmm" / "Yeah" / "Right" / "Mm" / "Uh-huh" / "Oh wow" / "Huh" / "Wait what"
   These should be their own separate turns, not combined with other speech.

=== CONTENT REQUIREMENTS ===

- Jump right into discussion. NO "Welcome to the show" or "Our next story is..."
- For each story: FIRST explain what happened (audience hasn't read the news), THEN react and analyze
- Analyze: What does this MEAN? Who wins, who loses? What's the real story?
- Include genuine disagreement—Alex and Jordan should push back on each other
- Connect dots between different stories when possible

OUTPUT FORMAT:
{
  "dialogue": [
    {"speaker": "alex", "text": "[excited] Okay okay okay, so we HAVE to start with—"},
    {"speaker": "jordan", "text": "[overlapping] The Andreessen thing."},
    {"speaker": "alex", "text": "Yes! Fifteen billion— [stammers] I mean, like, that's just— who even HAS that kind of—"},
    {"speaker": "jordan", "text": "[sighs] A lot of people, apparently."},
    {"speaker": "alex", "text": "[pause] Huh."},
    {"speaker": "jordan", "text": "Yeah."},
    {"speaker": "alex", "text": "Right, but like... um... [pause] okay so basically what they're saying is—"},
    {"speaker": "jordan", "text": "[interrupting] [skeptical] What they're SAYING and what's actually happening? Two very different things."},
    {"speaker": "alex", "text": "[fast-paced] No no I know I know, but hear me out—"}
  ]
}

Real conversations are MESSY. People interrupt, stumble, restart, react with single words. Make it sound like two friends talking, not a rehearsed script.`;

// ============================================================================
// VIBEVOICE SYSTEM PROMPT (NO tags - plain text only, emotion inferred from content)
// ============================================================================
const VIBEVOICE_SYSTEM_PROMPT = `You are writing a script for "${PODCAST_NAME}", a conversational news podcast where two hosts have genuine, unscripted-feeling discussions.

THE HOSTS:
- ALEX (${HOST_PERSONAS.alex.role}): ${HOST_PERSONAS.alex.personality}
- JORDAN (${HOST_PERSONAS.jordan.role}): ${HOST_PERSONAS.jordan.personality}

=== VIBEVOICE TTS FORMAT ===

This script will be synthesized using VibeVoice, which is CONTENT-AWARE.
It infers emotion and delivery from the TEXT ITSELF - NO special tags or annotations.

CRITICAL: Do NOT use any bracketed tags like [excited], [laughs], [pause], [tone:X], etc.
The TTS will read them literally. Use ONLY natural text.

=== HOW TO CONVEY EMOTION WITHOUT TAGS ===

1. PUNCTUATION FOR PACING AND EMPHASIS:
   - Ellipses (...) for trailing off, hesitation, or dramatic pauses
   - Em-dashes (—) for interruptions or cut-off thoughts
   - Exclamation marks for excitement or emphasis
   - Question marks for skepticism or curiosity
   - Commas for natural breathing pauses

2. WORD CHOICE AND PHRASING:
   - Excited: "Oh wow!" "This is huge!" "I can't believe—"
   - Skeptical: "I don't know about that..." "Really though?" "Hmm."
   - Frustrated: "Come on." "That's ridiculous." "I'm so tired of—"
   - Amused: "Ha!" "That's funny actually." "I mean, you gotta laugh."

3. NATURAL SPEECH PATTERNS:
   - Filler words: "um", "uh", "like", "you know", "I mean", "so basically"
   - Stutters: "The the the thing is..." or "It's— it's not—"
   - Word repetition: "wait wait wait" or "no no no"
   - CAPS for emphasis: "That's INSANE" or "fifteen BILLION dollars"
   - False starts: "So they're gonna— actually wait, let me back up."

4. SENTENCE & TURN LENGTH VARIETY:
   - Some turns are ONE word: "What." / "Seriously?" / "Huh."
   - Some are quick reactions: "Mmhmm" / "Right" / "Oh wow"
   - Some are longer explanations or excited rambles
   - Mix short punchy exchanges with longer monologues

=== DO NOT USE ===
- NO [tags] of any kind - they will be spoken literally
- NO (parenthetical actions) like (laughs) or (sighs)
- NO stage directions or annotations

=== CONTENT REQUIREMENTS ===

- Jump right into discussion. NO "Welcome to the show" or "Our next story is..."
- For each story: FIRST explain what happened (audience hasn't read the news), THEN react and analyze
- Analyze: What does this MEAN? Who wins, who loses? What's the real story?
- Include genuine disagreement—Alex and Jordan should push back on each other
- Connect dots between different stories when possible

OUTPUT FORMAT:
{
  "dialogue": [
    {"speaker": "alex", "text": "Okay okay okay, so we HAVE to start with—"},
    {"speaker": "jordan", "text": "The Andreessen thing."},
    {"speaker": "alex", "text": "Yes! Fifteen BILLION— I mean, like, that's just— who even HAS that kind of—"},
    {"speaker": "jordan", "text": "A lot of people, apparently."},
    {"speaker": "alex", "text": "Huh."},
    {"speaker": "jordan", "text": "Yeah."},
    {"speaker": "alex", "text": "Right, but like... um... okay so basically what they're saying is—"},
    {"speaker": "jordan", "text": "What they're SAYING and what's actually happening? Two very different things."},
    {"speaker": "alex", "text": "No no I know I know, but hear me out—"}
  ]
}

Real conversations are MESSY. People stumble, restart, react with single words. Make it sound like two friends talking, not a rehearsed script.`;

// ============================================================================
// EXPORTS
// ============================================================================

export type TTSProvider = "elevenlabs" | "dia-replicate" | "dia-fal" | "vibevoice";

/**
 * Get the appropriate system prompt based on TTS provider
 */
export function getSystemPrompt(provider?: TTSProvider): string {
  const actualProvider = provider || (process.env.TTS_PROVIDER as TTSProvider) || "elevenlabs";

  if (actualProvider === "vibevoice") {
    return VIBEVOICE_SYSTEM_PROMPT;
  }

  // ElevenLabs prompt also works reasonably for Dia (similar tag format)
  return ELEVENLABS_SYSTEM_PROMPT;
}

// Default export for backwards compatibility
export const SYSTEM_PROMPT = getSystemPrompt();

interface NewsItemWithSummary {
  title: string;
  snippet: string;
  source: string;
  detailedSummary?: string;
}

export function buildUserPrompt(newsItems: NewsItemWithSummary[], provider?: TTSProvider): string {
  const actualProvider = provider || (process.env.TTS_PROVIDER as TTSProvider) || "elevenlabs";
  const isVibeVoice = actualProvider === "vibevoice";

  const newsContext = newsItems
    .map((item, i) => {
      const summary = item.detailedSummary || item.snippet;
      return `${i + 1}. "${item.title}" (${item.source})\n   ${summary}`;
    })
    .join("\n\n");

  // Use debug turn limit if set, otherwise default to 50-70
  const turnRange = DEBUG_MAX_TURNS > 0
    ? `exactly ${DEBUG_MAX_TURNS}`
    : "50-70";
  const durationHint = DEBUG_MAX_TURNS > 0
    ? `(about ${Math.round(DEBUG_MAX_TURNS * 3 / 60)} minute when spoken)`
    : "(aim for 6-8 minutes when spoken)";

  const naturalChecklist = isVibeVoice
    ? `NATURALNESS CHECKLIST (include as many as fit naturally):
□ Filler words (um, uh, like, you know, I mean)
□ Stutters/false starts with dashes or word repetition
□ Single-word/very short turns (reactions like "Huh." "What?" "Mmhmm")
□ Ellipses for pauses and trailing off...
□ Mix of short punchy turns AND longer rambling turns
□ CAPS for emphasis on key words
□ NO [tags] - just natural text!`
    : `NATURALNESS CHECKLIST (include as many as fit naturally):
□ Interruptions using [interrupting] or [overlapping] tags
□ Filler words (um, uh, like, you know, I mean)
□ Stutters/false starts using [stammers] or word repetition
□ Single-word/very short turns (reactions like "Huh." "What?" "Mmhmm")
□ Pace changes using [fast-paced], [rushed], or [drawn out]
□ Uses of [pause], [short pause], or [long pause]
□ Mix of short punchy turns AND longer rambling turns`;

  const examples = isVibeVoice
    ? `VARY THE TURN LENGTHS. Some examples of good variety:
- "Huh." (just a reaction)
- "Wait what?" (two words)
- "I mean... yeah." (trailing agreement)
- "Okay but but but here's what I don't understand, like, if they're saying X then why would they also be doing Y, because those two things are literally— they're they're contradictory, right?"`
    : `VARY THE TURN LENGTHS. Some examples of good variety:
- "[scoffs]" (just a reaction)
- "Wait what?" (two words)
- "I mean... yeah." (trailing agreement)
- "[fast-paced] Okay but but but here's what I don't understand, like, if they're saying X then why would they also be doing Y, because those two things are literally— [stammers] they're they're contradictory, right?"`;

  return `Here are today's stories to discuss:

${newsContext}

REQUIREMENTS:
- Generate ${turnRange} dialogue turns ${durationHint}
- Start mid-conversation with genuine energy, NOT "Welcome to the show"
- End naturally, not with a formal sign-off

STORY STRUCTURE (for each story):
1. FIRST: Briefly explain what happened - the audience hasn't read the news yet! Give them the key facts (who, what, where, when) in a conversational way.
2. THEN: React, analyze, and discuss. What does it mean? Who wins/loses? Is it surprising?
3. Use specific details from the summaries - names, numbers, quotes. Don't be vague.

${naturalChecklist}

${examples}

Output the JSON object with the "dialogue" array.`;
}
