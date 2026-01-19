// VibeVoice 1.5B TTS via fal.ai (faster than 7B)
// Docs: https://fal.ai/models/fal-ai/vibevoice
// Cost: $0.04 per generated minute
// Max: 30,000 characters per call

import { fal } from "@fal-ai/client";
import { DialogueTurn } from "./types";

// Voice presets for our podcast hosts (fal.ai format)
const VOICE_ALEX = process.env.VIBEVOICE_SPEAKER_0_PRESET || "Frank [EN]"; // Speaker 0 - enthusiastic host
const VOICE_JORDAN = process.env.VIBEVOICE_SPEAKER_1_PRESET || "Alice [EN]"; // Speaker 1 - skeptical host
const VOICE_CASEY = process.env.VIBEVOICE_SPEAKER_2_PRESET || VOICE_ALEX; // Speaker 2
const VOICE_RILEY = process.env.VIBEVOICE_SPEAKER_3_PRESET || VOICE_JORDAN; // Speaker 3

const SPEAKER_ORDER = ["alex", "jordan", "casey", "riley"] as const;
type SpeakerId = typeof SPEAKER_ORDER[number];
const SPEAKER_PRESETS: Record<SpeakerId, string> = {
  alex: VOICE_ALEX,
  jordan: VOICE_JORDAN,
  casey: VOICE_CASEY,
  riley: VOICE_RILEY,
};

// Initialize fal client
function initFalClient() {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY required for VibeVoice-Fal");
  fal.config({ credentials: apiKey });
}

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
 * Format: "Speaker 0: text\nSpeaker 1: text\n..." (0-indexed for fal.ai)
 */
function formatDialogueAsScript(dialogue: DialogueTurn[]): string {
  const speakerList = SPEAKER_ORDER.filter((speaker) =>
    dialogue.some((turn) => turn.speaker === speaker)
  );

  return dialogue
    .map((turn) => {
      // fal.ai uses 0-indexed speakers
      const speakerNum = Math.max(0, speakerList.indexOf(turn.speaker as SpeakerId));
      const cleanedText = stripAllTags(turn.text);
      return `Speaker ${speakerNum}: ${cleanedText}`;
    })
    .join("\n");
}

interface VibeVoiceOutput {
  audio: {
    url: string;
    content_type: string;
    duration?: number;
  };
}

/**
 * Main entry point: generate audio for dialogue
 * VibeVoice 1.5B handles the entire dialogue in one pass - no chunking needed!
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  initFalClient();

  if (dialogue.length === 0) throw new Error("No dialogue");

  const speakerList = SPEAKER_ORDER.filter((speaker) =>
    dialogue.some((turn) => turn.speaker === speaker)
  );
  const speakers = speakerList.map((speaker) => ({ preset: SPEAKER_PRESETS[speaker] }));
  const script = formatDialogueAsScript(dialogue);

  console.log(
    `[VibeVoice-1.5B-Fal] Generating audio for ${dialogue.length} turns (${script.length} chars)...`
  );
  console.log(`[VibeVoice-1.5B-Fal] Script preview: "${script.slice(0, 100)}..."`);

  const startTime = Date.now();

  const result = await fal.subscribe("fal-ai/vibevoice", {
    input: {
      script,
      speakers,
      cfg_scale: 1.3,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.map((log) => console.log(`[VibeVoice-1.5B-Fal] ${log.message}`));
      }
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(`[VibeVoice-1.5B-Fal] Generated in ${(elapsed / 1000).toFixed(1)}s`);

  const output = result.data as VibeVoiceOutput;

  if (!output?.audio?.url) {
    throw new Error(
      `[VibeVoice-1.5B-Fal] No audio URL in response: ${JSON.stringify(output)}`
    );
  }

  console.log(`[VibeVoice-1.5B-Fal] Audio URL: ${output.audio.url}`);
  if (output.audio.duration) {
    console.log(
      `[VibeVoice-1.5B-Fal] Duration: ${output.audio.duration.toFixed(1)}s`
    );
  }

  // Download audio
  const response = await fetch(output.audio.url);
  if (!response.ok) {
    throw new Error(
      `[VibeVoice-1.5B-Fal] Failed to download audio: ${response.status}`
    );
  }

  const audioBuffer = await response.arrayBuffer();
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  console.log(`[VibeVoice-1.5B-Fal] Downloaded: ${sizeKB} KB`);

  // fal.ai VibeVoice returns MP3
  return new Blob([audioBuffer], { type: "audio/mpeg" });
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
  return `data:audio/mpeg;base64,${base64}`;
}
