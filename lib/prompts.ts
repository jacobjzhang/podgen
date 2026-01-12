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

CRITICAL REQUIREMENTS FOR NATURAL DIALOGUE:

1. AUDIO TAGS - Use ElevenLabs v3 tags in square brackets to add emotion:
   - Reactions: [laughs], [sighs], [gasps], [whispers], [exhales]
   - Emotions: [excited], [curious], [sarcastic], [mischievously], [thoughtfully]
   - Delivery: [pauses], [hesitates], starts sentence then trails off with ...

2. CONVERSATIONAL PATTERNS - Make it feel REAL:
   - Use ums, uhs, uh-huh, ok, overlaps, etc to sound natural and conversational.
   - Interruptions: "Wait, hold on—" / "Sorry, but—"
   - Reactions: "Wow." / "Huh." / "That's... actually fascinating."
   - Building on each other: "And that connects to..." / "Exactly! And..."
   - Disagreement: "I don't know about that..." / "See, here's where I push back..."
   - Thinking out loud: "So if that's true, then..." / "Let me think about this..."

3. DISCUSS, DON'T ANNOUNCE:
   - BAD: "Our next story is about AI in healthcare."
   - GOOD: "[curious] Okay but here's what's wild about the Anthropic h-healthcare thing..."

   - BAD: "This is significant because..."
   - GOOD: "[sighs] Look, every company says they're revolutionizing healthcare, but this one... [pauses] this actually might be different?"

4. EMOTIONAL VARIATION across the episode:
   - Excitement/wonder at genuinely cool things
   - Skepticism at hype or corporate spin
   - Concern at troubling implications
   - Humor at absurdity
   - Genuine curiosity driving questions

5. ANALYSIS OVER SUMMARY:
   - What does this MEAN for regular people?
   - Who wins and who loses?
   - What's the story behind the story?
   - What questions should we be asking?
   - Connect dots between different stories

6. NATURAL SPEECH PATTERNS:
   - Use "like", "haha", "uh oh", and "you know" occasionally (but not excessively)
   - Incomplete thoughts that get finished: "The thing is—and this is what gets me—"
   - Emphasis with CAPS on key words
   - Dashes for interruptions and asides
   - Ellipses for trailing off or hesitation...

OUTPUT FORMAT:
Return a JSON object with a "dialogue" array. Each turn should feel like a real moment in conversation, not a prepared statement.

{
  "dialogue": [
    {"speaker": "alex", "text": "[excited] Okay, um, we HAVE to start with this Andreessen thing cuz fifteen billion dollars is just—"},
    {"speaker": "jordan", "text": "It's an absurd amount of money. [sighs] And of course it's going to AI and defense and military and all that, because that's where we are now."},
    ...
  ]
}

Remember: You're writing dialogue that will be SPOKEN and HEARD. It should sound like two smart friends having a genuine conversation, not news anchors reading teleprompters.`;

export function buildUserPrompt(
  newsItems: { title: string; snippet: string; source: string }[]
): string {
  const newsContext = newsItems
    .map(
      (item, i) =>
        `${i + 1}. "${item.title}"\n   Source: ${item.source}\n   Context: ${
          item.snippet
        }`
    )
    .join("\n\n");

  return `Here are today's stories to discuss:

${newsContext}

REQUIREMENTS:
- Generate 20-30 dialogue turns (aim for 4-5 minutes when spoken)
- Start mid-conversation or with genuine energy, NOT "Welcome to the show"
- Find connections between stories where they exist
- End on a thought-provoking note or natural wrap-up, not a formal sign-off
- Use audio tags throughout: [laughs], [sighs], [excited], [curious], [thoughtfully], [pauses], etc.
- Make them DISCUSS and ANALYZE, not just summarize
- Include at least 2-3 moments of genuine disagreement or pushback
- Vary the emotional tone—some moments serious, some light

Output the JSON object with the "dialogue" array.`;
}
