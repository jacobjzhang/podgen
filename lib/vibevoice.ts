// VibeVoice TTS via Replicate
// Native multi-speaker dialogue generation (up to 4 speakers, 90 min)
// Docs: https://replicate.com/microsoft/vibevoice

import Replicate from "replicate";
import { DialogueTurn } from "./types";

// VibeVoice model version
const VIBEVOICE_VERSION = "624421f6fdd4122d0b3ff391ff3449f09db9ad4927167110a4c4b104fa37f728";

// Voice presets for our podcast hosts
const VOICE_ALEX = "en-Frank_man";    // Speaker 1 - enthusiastic host
const VOICE_JORDAN = "en-Alice_woman"; // Speaker 2 - skeptical host

/**
 * Strip ALL tags from text for VibeVoice
 * VibeVoice is content-aware and infers emotion from text - NO tags supported
 * Any [tag] or [tag:value] will be spoken literally if not removed
 */
function stripAllTags(text: string): string {
  // Remove all bracketed tags: [anything], [anything:value], [anything here]
  return text.replace(/\[[^\]]+\]\s*/g, "").trim();
}

/**
 * Convert dialogue turns to VibeVoice script format
 * Format: "Speaker 1: text\nSpeaker 2: text\n..."
 */
function formatDialogueAsScript(dialogue: DialogueTurn[]): string {
  return dialogue
    .map((turn) => {
      const speakerNum = turn.speaker === "alex" ? "1" : "2";
      // Strip ALL tags - VibeVoice infers emotion from content
      const cleanedText = stripAllTags(turn.text);
      return `Speaker ${speakerNum}: ${cleanedText}`;
    })
    .join("\n");
}

/**
 * Main entry point: generate audio for dialogue
 * VibeVoice handles the entire dialogue in one pass - no chunking needed!
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN required");
  if (dialogue.length === 0) throw new Error("No dialogue");

  const replicate = new Replicate({ auth: apiToken });
  const script = formatDialogueAsScript(dialogue);

  console.log(`[VibeVoice] Generating audio for ${dialogue.length} turns...`);
  console.log(`[VibeVoice] Script preview: "${script.slice(0, 100)}..."`);

  const startTime = Date.now();

  // Create prediction
  const prediction = await replicate.predictions.create({
    version: VIBEVOICE_VERSION,
    input: {
      script,
      scale: 1.3,
      speaker_1: VOICE_ALEX,
      speaker_2: VOICE_JORDAN,
    },
  });

  console.log(`[VibeVoice] Prediction ID: ${prediction.id}`);

  // Poll for completion
  let output = prediction.output;
  let status = prediction.status;

  while (status !== "succeeded" && status !== "failed" && status !== "canceled") {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const updated = await replicate.predictions.get(prediction.id);
    status = updated.status;
    output = updated.output;

    if (status === "processing") {
      console.log(`[VibeVoice] Processing...`);
    }
  }

  if (status !== "succeeded") {
    throw new Error(`[VibeVoice] Generation failed: ${status}`);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[VibeVoice] Generated in ${(elapsed / 1000).toFixed(1)}s`);

  // Get audio URL from output
  let audioUrl: string;
  if (typeof output === "string") {
    audioUrl = output;
  } else if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") {
      audioUrl = obj.url;
    } else {
      throw new Error(`[VibeVoice] Unexpected output format: ${JSON.stringify(output)}`);
    }
  } else {
    throw new Error(`[VibeVoice] Unexpected output type: ${typeof output}`);
  }

  console.log(`[VibeVoice] Downloading from: ${audioUrl}`);

  // Download audio
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`[VibeVoice] Failed to download audio: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  console.log(`[VibeVoice] Downloaded: ${sizeKB} KB`);

  // VibeVoice returns MP3
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
