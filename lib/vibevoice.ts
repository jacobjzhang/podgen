// VibeVoice 7B TTS via fal.ai
// Native multi-speaker dialogue generation (up to 4 speakers)
// Docs: https://fal.ai/models/fal-ai/vibevoice/7b
// Max: 30,000 characters per call

import { fal } from "@fal-ai/client";
import { DialogueTurn } from "./types";

// Voice presets for our podcast hosts (fal.ai format)
const VOICE_ALEX = "Frank [EN]";      // Speaker 0 - enthusiastic host
const VOICE_JORDAN = "Alice [EN]";    // Speaker 1 - skeptical host

// Initialize fal client
function initFalClient() {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY required for VibeVoice");
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
  return dialogue
    .map((turn) => {
      // fal.ai uses 0-indexed speakers
      const speakerNum = turn.speaker === "alex" ? "0" : "1";
      const cleanedText = stripAllTags(turn.text);
      return `Speaker ${speakerNum}: ${cleanedText}`;
    })
    .join("\n");
}

interface VibeVoice7BOutput {
  audio: {
    url: string;
    content_type: string;
    duration?: number;
  };
}

/**
 * Main entry point: generate audio for dialogue
 * VibeVoice 7B handles the entire dialogue in one pass - no chunking needed!
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  initFalClient();

  if (dialogue.length === 0) throw new Error("No dialogue");

  const script = formatDialogueAsScript(dialogue);

  console.log(`[VibeVoice-7B] Generating audio for ${dialogue.length} turns (${script.length} chars)...`);
  console.log(`[VibeVoice-7B] Script preview: "${script.slice(0, 100)}..."`);

  const startTime = Date.now();

  const result = await fal.subscribe("fal-ai/vibevoice/7b", {
    input: {
      script,
      speakers: [
        { preset: VOICE_ALEX },     // Speaker 0
        { preset: VOICE_JORDAN },   // Speaker 1
      ],
      cfg_scale: 1.3,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.map((log) => console.log(`[VibeVoice-7B] ${log.message}`));
      }
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(`[VibeVoice-7B] Generated in ${(elapsed / 1000).toFixed(1)}s`);

  const output = result.data as VibeVoice7BOutput;

  if (!output?.audio?.url) {
    throw new Error(`[VibeVoice-7B] No audio URL in response: ${JSON.stringify(output)}`);
  }

  console.log(`[VibeVoice-7B] Audio URL: ${output.audio.url}`);
  if (output.audio.duration) {
    console.log(`[VibeVoice-7B] Duration: ${output.audio.duration.toFixed(1)}s`);
  }

  // Download audio
  const response = await fetch(output.audio.url);
  if (!response.ok) {
    throw new Error(`[VibeVoice-7B] Failed to download audio: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  console.log(`[VibeVoice-7B] Downloaded: ${sizeKB} KB`);

  // fal.ai VibeVoice 7B returns MP3
  // Log what we got for debugging
  console.log(`[VibeVoice-7B] Content-Type from API: ${output.audio.content_type}`);
  return new Blob([audioBuffer], { type: "audio/mpeg" });
}

/**
 * Generate audio and return as base64 data URL
 */
export async function generateAudioDataUrl(dialogue: DialogueTurn[]): Promise<string> {
  const blob = await generateAudio(dialogue);
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}
