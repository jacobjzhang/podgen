// Podcast host personas and dialogue generation prompts
// Uses ElevenLabs v3 audio tags for emotional, natural speech

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

export const SYSTEM_PROMPT = `You are writing a script for "${PODCAST_NAME}", a conversational news podcast where two hosts have genuine, unscripted-feeling discussions.

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

interface NewsItemWithSummary {
  title: string;
  snippet: string;
  source: string;
  detailedSummary?: string;
}

export function buildUserPrompt(newsItems: NewsItemWithSummary[]): string {
  const newsContext = newsItems
    .map((item, i) => {
      const summary = item.detailedSummary || item.snippet;
      return `${i + 1}. "${item.title}" (${item.source})\n   ${summary}`;
    })
    .join("\n\n");

  return `Here are today's stories to discuss:

${newsContext}

REQUIREMENTS:
- Generate 35-50 dialogue turns (aim for 4-5 minutes when spoken)
- Start mid-conversation with genuine energy, NOT "Welcome to the show"
- End naturally, not with a formal sign-off
- USE THE SPECIFIC DETAILS in the summaries! Mention the names, numbers, and quotes - react to specifics, don't just summarize.

NATURALNESS CHECKLIST (you MUST include all of these):
□ At least 5 interruptions using [interrupting] or [overlapping] tags
□ At least 8 filler words (um, uh, like, you know, I mean)
□ At least 3 stutters/false starts using [stammers] or word repetition
□ At least 5 single-word/very short turns (reactions like "Huh." "What?" "Mmhmm")
□ At least 2 pace changes using [fast-paced], [rushed], or [drawn out]
□ At least 3 uses of [pause], [short pause], or [long pause]
□ Mix of short punchy turns AND longer rambling turns
□ At least 3 moments of genuine disagreement/pushback

VARY THE TURN LENGTHS. Some examples of good variety:
- "[scoffs]" (just a reaction)
- "Wait what?" (two words)
- "I mean... yeah." (trailing agreement)
- "[fast-paced] Okay but but but here's what I don't understand, like, if they're saying X then why would they also be doing Y, because those two things are literally— [stammers] they're they're contradictory, right?"

Output the JSON object with the "dialogue" array.`;
}
