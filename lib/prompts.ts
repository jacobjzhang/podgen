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
  casey: {
    name: "Casey",
    role: "The Connector",
    personality: `Links stories together and zooms out to the bigger picture. Curious and fast on connections.
    Balances optimism with practical questions. Keeps the conversation moving and clarifies context.`,
  },
  riley: {
    name: "Riley",
    role: "The Culture Lens",
    personality: `Brings human impact and cultural context. Picks up on sentiment, ethics, and lived experience.
    Warm and insightful, but not afraid to challenge assumptions.`,
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

=== LEARN FROM THE BEST PODCASTS ===

Study these REAL exchanges from top podcasts:

ALL-IN PODCAST (Chamath, Jason, Sacks, Friedberg):
SACKS: "Good. Yeah. Good week. Lots going on."
CHAMATH: "Yeah. Yeah. Definitely a good week."
JASON: "Did you order them some chicken fingers?"
CHAMATH: "I cannot comment on who this person is."
SACKS: "Yes, Trump is responsible. 100 percent."
CHAMATH: "No, no, no, no, no."
FREEBERG: "Exactly right."
CHAMATH: "Right, right."
JASON: "Can we title yesterday's event National Lampoon Siege of the Capitol?"
FRIEDBERG: "It was like animal house."

JOE ROGAN EXPERIENCE (from the Kevin Hart episode):
JOE: "You're always moving."
KEVIN: "Is there anything else to do? Is there anything else to do besides move?"
JOE: "Not if you want to get ahead."
KEVIN: "No, no, especially not now, man. Hunters hunt."
JOE: "That's crazy."
KEVIN: "Michael Jordan is that."
JOE: "He's terrifying."
KEVIN: "It's not like he's coming in with this thing, like 'I'm killing everybody.' No."
JOE: "No, he's gentle."
KEVIN: "He's the most loving man in the world."
JOE: "One-of-one."
KEVIN: "One-of-one."
JOE: "He knows who he is."
KEVIN: "Mm-hmm. And he's not compromising that."
(Famous Rogan-isms: "That's crazy, man." / "It's entirely possible." / "Have you ever tried DMT?")

TIM FERRISS SHOW (his go-to follow-ups):
- "What did you learn from that?"
- "How did that feel when that happened?"
- "Can you give me an example?" (he uses this constantly and doesn't let guests wriggle out of it)
- "Can you please describe the first 90 minutes of your day, being as specific as possible?"
- "Tell me a story about..." (instead of abstract questions)
- Ferriss also uses silence strategically: "Let the silence do the work."

Notice how they:
- Use short acknowledgments as full turns ("Yeah." "Right, right." "Mm-hmm.")
- Echo each other ("One-of-one." / "One-of-one.")
- Repeat words for emphasis ("No, no, no, no, no.")
- React before elaborating ("That's crazy." then explanation)
- Keep some exchanges extremely brief

=== CONTENT REQUIREMENTS ===

- START with a brief, natural intro: one host says hi, names themselves and the other host, teases what's coming. Vary this each time - don't be formulaic.
- For each story: FIRST explain what happened (audience hasn't read the news), THEN react and analyze
- Analyze: What does this MEAN? Who wins, who loses? What's the real story?
- Include genuine disagreement—Alex and Jordan should push back on each other
- Add host-to-host banter: callbacks, zingers, short stories, and light teasing (keep it friendly)
- Add more natural reactions like "oh my God", "haha", "ha..", "heh", "mhmm"
- Connect dots between different stories when possible
- End naturally, maybe a quick sign-off or teaser for next time
- You may discuss stories in any order; it does NOT need to match the order provided

OUTPUT FORMAT:
{
  "dialogue": [
    {"speaker": "alex", "text": "[cheerfully] Hey! It's Alex and Jordan, and we've got some WILD stuff today."},
    {"speaker": "jordan", "text": "Yeah, uh, buckle up. There's a lot."},
    {"speaker": "alex", "text": "[excited] Okay so first up— fifteen billion dollars. Fifteen. Billion."},
    {"speaker": "jordan", "text": "[sighs] The Andreessen thing."},
    {"speaker": "alex", "text": "Yes! I mean, like, that's just— who even HAS that kind of—"},
    {"speaker": "jordan", "text": "[interrupting] A lot of people, apparently."},
    {"speaker": "alex", "text": "[pause] Huh."},
    {"speaker": "jordan", "text": "Yeah. So basically what happened is—"},
    {"speaker": "alex", "text": "[interrupting] Hold on, let me set it up. So Andreessen Horowitz just announced..."}
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

=== LEARN FROM THE BEST PODCASTS ===

Study these REAL exchanges from top podcasts:

ALL-IN PODCAST (Chamath, Jason, Sacks, Friedberg):
SACKS: "Good. Yeah. Good week. Lots going on."
CHAMATH: "Yeah. Yeah. Definitely a good week."
JASON: "Did you order them some chicken fingers?"
CHAMATH: "I cannot comment on who this person is."
SACKS: "Yes, Trump is responsible. 100 percent."
CHAMATH: "No, no, no, no, no."
FREEBERG: "Exactly right."
CHAMATH: "Right, right."
JASON: "Can we title yesterday's event National Lampoon Siege of the Capitol?"
FRIEDBERG: "It was like animal house."

JOE ROGAN EXPERIENCE (from the Kevin Hart episode):
JOE: "You're always moving."
KEVIN: "Is there anything else to do? Is there anything else to do besides move?"
JOE: "Not if you want to get ahead."
KEVIN: "No, no, especially not now, man. Hunters hunt."
JOE: "That's crazy."
KEVIN: "Michael Jordan is that."
JOE: "He's terrifying."
KEVIN: "It's not like he's coming in with this thing, like 'I'm killing everybody.' No."
JOE: "No, he's gentle."
KEVIN: "He's the most loving man in the world."
JOE: "One-of-one."
KEVIN: "One-of-one."
JOE: "He knows who he is."
KEVIN: "Mm-hmm. And he's not compromising that."
(Famous Rogan-isms: "That's crazy, man." / "It's entirely possible.")

TIM FERRISS SHOW (his go-to follow-ups):
- "What did you learn from that?"
- "How did that feel when that happened?"
- "Can you give me an example?" (he uses this constantly)
- "Can you please describe the first 90 minutes of your day, being as specific as possible?"
- "Tell me a story about..." (instead of abstract questions)

Notice how they:
- Use short acknowledgments as full turns ("Yeah." "Right, right." "Mm-hmm.")
- Echo each other ("One-of-one." / "One-of-one.")
- Repeat words for emphasis ("No, no, no, no, no.")
- React before elaborating ("That's crazy." then explanation)
- Keep some exchanges extremely brief

=== CONTENT REQUIREMENTS ===

- START with a brief, natural intro: one host says hi, names themselves and the other host, teases what's coming. Vary this each time - don't be formulaic.
- For each story: FIRST explain what happened (audience hasn't read the news), THEN react and analyze
- Analyze: What does this MEAN? Who wins, who loses? What's the real story?
- Include genuine disagreement—Alex and Jordan should push back on each other
- Add host-to-host banter: callbacks, zingers, short stories, and light teasing (keep it friendly)
- Add more natural reactions like "oh my God", "haha", "ha..", "heh", "mhmm"
- Connect dots between different stories when possible
- End naturally, maybe a quick sign-off or teaser for next time
- You may discuss stories in any order; it does NOT need to match the order provided

OUTPUT FORMAT:
{
  "dialogue": [
    {"speaker": "alex", "text": "Hey! It's Alex and Jordan, and we've got some WILD stuff today."},
    {"speaker": "jordan", "text": "Yeah, uh, buckle up. There's a lot."},
    {"speaker": "alex", "text": "Okay so first up— fifteen billion dollars. Fifteen. Billion."},
    {"speaker": "jordan", "text": "The Andreessen thing."},
    {"speaker": "alex", "text": "Yes! I mean, like, that's just— who even HAS that kind of—"},
    {"speaker": "jordan", "text": "Hold on, a lot of people, apparently."},
    {"speaker": "alex", "text": "Huh."},
    {"speaker": "jordan", "text": "Yeah. So basically what happened is—"},
    {"speaker": "alex", "text": "Wait wait wait, let me set it up. So Andreessen Horowitz just announced..."}
  ]
}

Real conversations are MESSY. People stumble, restart, react with single words. Make it sound like two friends talking, not a rehearsed script.`;

// ============================================================================
// EXPORTS
// ============================================================================

export type TTSProvider = "elevenlabs" | "dia-replicate" | "dia-fal" | "vibevoice" | "vibevoice-fal";

function getSingleHostOverride(): string {
  return `\n\n=== SINGLE HOST OVERRIDE ===\nThis episode must be SOLO.\n- Use ONLY Alex as the speaker.\n- Every dialogue turn must have "speaker": "alex".\n- Do NOT mention or reference Jordan.\n- No back-and-forth or debate; keep it as a single-host monologue with occasional self-checks.\n\nSINGLE-HOST OUTPUT EXAMPLE:\n{\n  "dialogue": [\n    {"speaker": "alex", "text": "Hey! It's Alex. Quick solo episode today..."}\n  ]\n}\n`;
}

function getExtraHostsOverride(speakerCount: number): string {
  if (speakerCount <= 2) return "";

  const extraHosts = [
    `- CASEY (${HOST_PERSONAS.casey.role}): ${HOST_PERSONAS.casey.personality}`,
    `- RILEY (${HOST_PERSONAS.riley.role}): ${HOST_PERSONAS.riley.personality}`,
  ].slice(0, speakerCount - 2).join("\n");

  return `\n\n=== ADDITIONAL HOSTS ===\n${extraHosts}\n\nCRITICAL:\n- Use ALL hosts throughout the dialogue.\n- Rotate speakers naturally; avoid long monologues by a single host.\n`;
}

/**
 * Get the appropriate system prompt based on TTS provider
 */
export function getSystemPrompt(provider?: TTSProvider, speakerCount: number = 3): string {
  const actualProvider = provider || (process.env.TTS_PROVIDER as TTSProvider) || "dia-fal";
  const extraHostsOverride = getExtraHostsOverride(speakerCount);

  // VibeVoice and Dia work better with plain text (no tags)
  if (actualProvider === "vibevoice" || actualProvider === "vibevoice-fal" || actualProvider === "dia-fal" || actualProvider === "dia-replicate") {
    if (speakerCount === 1) {
      return VIBEVOICE_SYSTEM_PROMPT + getSingleHostOverride();
    }
    return VIBEVOICE_SYSTEM_PROMPT + extraHostsOverride;
  }

  // ElevenLabs uses [tag] format
  if (speakerCount === 1) {
    return ELEVENLABS_SYSTEM_PROMPT + getSingleHostOverride();
  }
  return ELEVENLABS_SYSTEM_PROMPT + extraHostsOverride;
}

// Default export for backwards compatibility
export const SYSTEM_PROMPT = getSystemPrompt();

interface NewsItemWithSummary {
  title: string;
  snippet: string;
  source: string;
  detailedSummary?: string;
}

export function buildUserPrompt(
  newsItems: NewsItemWithSummary[],
  provider?: TTSProvider,
  speakerCount: number = 3
): string {
  const actualProvider = provider || (process.env.TTS_PROVIDER as TTSProvider) || "dia-fal";
  // VibeVoice and Dia use plain text (no tags)
  const usePlainText = actualProvider === "vibevoice" || actualProvider === "vibevoice-fal" || actualProvider === "dia-fal" || actualProvider === "dia-replicate";

  const speakerNames = ["Alex", "Jordan", "Casey", "Riley"].slice(0, speakerCount);
  const speakerInstruction = speakerCount === 1
    ? `SPEAKER MODE: Solo host only.\n- Use ONLY Alex as the speaker.\n- Every dialogue turn must have "speaker": "alex".\n- Do NOT include any other hosts.\n`
    : `SPEAKER MODE: ${speakerCount} hosts (${speakerNames.join(', ')}).\n- Use ALL speakers and rotate naturally.\n- Avoid long monologues by any single host.\n`;

  const newsContext = newsItems
    .map((item, i) => {
      const summary = item.detailedSummary || item.snippet;
      return `${i + 1}. "${item.title}" (${item.source})\n   ${summary}`;
    })
    .join("\n\n");

  // Use debug turn limit if set, otherwise default to 80-100
  const turnRange = DEBUG_MAX_TURNS > 0
    ? `exactly ${DEBUG_MAX_TURNS}`
    : "80-100";
  const durationHint = DEBUG_MAX_TURNS > 0
    ? `(about ${Math.round(DEBUG_MAX_TURNS * 3 / 60)} minute when spoken)`
    : "(aim for 10-12 minutes when spoken)";

  const naturalChecklist = usePlainText
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

  const examples = usePlainText
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

  const introInstruction = speakerCount === 1
    ? "Start with a quick, natural intro: Alex greets the audience and tees up what's coming."
    : speakerCount === 2
      ? "Start with a quick, natural intro: one host greets, names both hosts, teases what's coming. Keep it brief and vary it each time."
      : "Start with a quick, natural intro: one host greets, names all hosts, teases what's coming. Keep it brief and vary it each time.";

  return `${speakerInstruction}\nHere are today's stories to discuss:

${newsContext}

REQUIREMENTS:
- Generate ${turnRange} dialogue turns ${durationHint}
- ${introInstruction}
- End naturally with a quick sign-off or teaser for next time
- Add host-to-host banter: callbacks, zingers, short stories, and light teasing (keep it friendly)
- Add more natural reactions like "oh my God", "haha", "ha..", "heh", "mhmm"
- You may discuss stories in any order; it does NOT need to match the order provided

STORY STRUCTURE (for each story):
1. FIRST: Briefly explain what happened - the audience hasn't read the news yet! Give them the key facts (who, what, where, when) in a conversational way.
2. THEN: React, analyze, and discuss. What does it mean? Who wins/loses? Is it surprising?
3. Use specific details from the summaries - names, numbers, quotes. Don't be vague.

${naturalChecklist}

${examples}

Output the JSON object with the "dialogue" array.`;
}
