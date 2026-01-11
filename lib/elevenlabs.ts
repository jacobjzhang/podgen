// ElevenLabs Text-to-Dialogue API client
// Docs: https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert

import { DialogueTurn } from "./types";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-dialogue";

// Default voice IDs - can be overridden via env
// Browse voices at: https://elevenlabs.io/voice-library
// List your voices: curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/voices
const DEFAULT_VOICE_1 = "B5wiYbiNK3GCUhkdcM4n"; // chris - Deep, Confident, Energetic (male)
const DEFAULT_VOICE_2 = "kPzsL2i3teMYv0FxEYQ6"; // brittney - Knowledgable, Professional (female)

interface DialogueInput {
  text: string;
  voice_id: string;
}

/**
 * Map speakers to voice IDs
 */
function getVoiceId(speaker: "alex" | "jordan"): string {
  if (speaker === "alex") {
    return process.env.ELEVENLABS_VOICE_1 || DEFAULT_VOICE_1;
  }
  return process.env.ELEVENLABS_VOICE_2 || DEFAULT_VOICE_2;
}

/**
 * Convert dialogue turns to ElevenLabs audio using Text-to-Dialogue API
 * Returns a blob URL for the generated audio
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY must be set in environment");
  }

  if (dialogue.length === 0) {
    throw new Error("No dialogue provided for audio generation");
  }

  // Convert dialogue turns to ElevenLabs format
  const inputs: DialogueInput[] = dialogue.map((turn) => ({
    text: turn.text,
    voice_id: getVoiceId(turn.speaker),
  }));

  const totalChars = inputs.reduce((sum, i) => sum + i.text.length, 0);
  console.log(
    `[ElevenLabs] Generating audio for ${inputs.length} dialogue turns (${totalChars} chars)...`
  );
  console.log(
    `[ElevenLabs] Using voices: Alex=${getVoiceId("alex")}, Jordan=${getVoiceId(
      "jordan"
    )}`
  );
  const startTime = Date.now();

  const response = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs,
      model_id: "eleven_v3", // Latest model with best dialogue quality
    }),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    console.error(`[ElevenLabs] API error after ${elapsed}ms:`, error);
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  // Response is binary audio data (MP3)
  const audioBuffer = await response.arrayBuffer();
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  console.log(`[ElevenLabs] Audio generated in ${elapsed}ms (${sizeKB} KB)`);

  return new Blob([audioBuffer], { type: "audio/mpeg" });
}

/**
 * Generate audio and return as base64 data URL
 * Useful for embedding directly in responses
 */
export async function generateAudioDataUrl(
  dialogue: DialogueTurn[]
): Promise<string> {
  const blob = await generateAudio(dialogue);
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

/**
 * Get available voices from ElevenLabs
 * Useful for letting users customize their podcast hosts
 */
export async function getVoices(): Promise<
  Array<{ voice_id: string; name: string }>
> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY must be set in environment");
  }

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs voices API error: ${response.status}`);
  }

  const data = await response.json();
  return data.voices.map((v: { voice_id: string; name: string }) => ({
    voice_id: v.voice_id,
    name: v.name,
  }));
}
