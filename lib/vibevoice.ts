// VibeVoice 1.5B TTS via Replicate
// Native multi-speaker dialogue generation (up to 4 speakers, up to 90 min)
// Docs: https://replicate.com/microsoft/vibevoice
// Cost: ~$0.10 per run

import Replicate from "replicate";
import { DialogueTurn } from "./types";

// Voice presets for our podcast hosts
const VOICE_ALEX = process.env.VIBEVOICE_SPEAKER_0_PRESET_REPLICATE || "en-Frank_man"; // Speaker 1 - enthusiastic host
const VOICE_JORDAN = process.env.VIBEVOICE_SPEAKER_1_PRESET_REPLICATE || "en-Alice_woman"; // Speaker 2 - skeptical host
const VOICE_CASEY = process.env.VIBEVOICE_SPEAKER_2_PRESET_REPLICATE || VOICE_ALEX; // Speaker 3
const VOICE_RILEY = process.env.VIBEVOICE_SPEAKER_3_PRESET_REPLICATE || VOICE_JORDAN; // Speaker 4

const SPEAKER_ORDER = ["alex", "jordan", "casey", "riley"] as const;
type SpeakerId = typeof SPEAKER_ORDER[number];
const SPEAKER_PRESETS: Record<SpeakerId, string> = {
  alex: VOICE_ALEX,
  jordan: VOICE_JORDAN,
  casey: VOICE_CASEY,
  riley: VOICE_RILEY,
};

/**
 * Strip ALL tags from text for VibeVoice
 * VibeVoice is content-aware and infers emotion from text - NO tags supported
 * Any [tag] or [tag:value] will be spoken literally if not removed
 */
function stripAllTags(text: string): string {
  return text.replace(/\[[^\]]+\]\s*/g, "").trim();
}

/**
 * Convert dialogue turns to VibeVoice script format
 * Format: "[S1] text [S2] text..." for Replicate
 */
function formatDialogueAsScript(dialogue: DialogueTurn[]): string {
  const speakerList = SPEAKER_ORDER.filter((speaker) =>
    dialogue.some((turn) => turn.speaker === speaker)
  );

  return dialogue
    .map((turn) => {
      const speakerIndex = Math.max(0, speakerList.indexOf(turn.speaker as SpeakerId));
      const speakerTag = `[S${speakerIndex + 1}]`;
      const cleanedText = stripAllTags(turn.text);
      return `${speakerTag} ${cleanedText}`;
    })
    .join(" ");
}

/**
 * Main entry point: generate audio for dialogue
 * VibeVoice 1.5B handles the entire dialogue in one pass - no chunking needed!
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN required for VibeVoice");

  const replicate = new Replicate({ auth: apiToken });

  if (dialogue.length === 0) throw new Error("No dialogue");

  const speakerList = SPEAKER_ORDER.filter((speaker) =>
    dialogue.some((turn) => turn.speaker === speaker)
  );
  const script = formatDialogueAsScript(dialogue);

  console.log(
    `[VibeVoice-1.5B] Generating audio for ${dialogue.length} turns (${script.length} chars)...`
  );
  console.log(`[VibeVoice-1.5B] Script preview: "${script.slice(0, 100)}..."`);

  const startTime = Date.now();

  const input: Record<string, unknown> = {
    script,
    scale: 1.3,
  };

  speakerList.forEach((speaker, index) => {
    input[`speaker_${index + 1}`] = SPEAKER_PRESETS[speaker];
  });

  const output = await replicate.run("microsoft/vibevoice", { input });

  const elapsed = Date.now() - startTime;
  console.log(`[VibeVoice-1.5B] Generated in ${(elapsed / 1000).toFixed(1)}s`);

  // Output is the audio URL (Replicate returns it directly as a string)
  const audioUrl = output as unknown as string;
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new Error(
      `[VibeVoice-1.5B] No audio URL in response: ${JSON.stringify(output)}`
    );
  }

  console.log(`[VibeVoice-1.5B] Audio URL: ${audioUrl}`);

  // Download audio
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(
      `[VibeVoice-1.5B] Failed to download audio: ${response.status}`
    );
  }

  const audioBuffer = await response.arrayBuffer();
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  console.log(`[VibeVoice-1.5B] Downloaded: ${sizeKB} KB`);

  // Replicate VibeVoice returns WAV
  return new Blob([audioBuffer], { type: "audio/wav" });
}

/**
 * Generate audio and return as base64 data URL
 */
export async function generateAudioDataUrl(
  dialogue: DialogueTurn[]
): Promise<string> {
  const blob = await generateAudio(dialogue);
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:audio/wav;base64,${base64}`;
}
