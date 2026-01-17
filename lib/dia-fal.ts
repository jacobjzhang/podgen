// Dia TTS via fal.ai
// Docs: https://fal.ai/models/fal-ai/dia-tts
// Output: MP3 audio
// Cost: $0.04 per 1000 characters
// Optimal length: 5-20 seconds per clip

import { fal } from "@fal-ai/client";
import { DialogueTurn } from "./types";

// Debug mode: only generate first N chunks (0 = all)
const DEBUG_MAX_CHUNKS = process.env.DEBUG_MAX_CHUNKS
  ? parseInt(process.env.DEBUG_MAX_CHUNKS)
  : 0;

// Initialize fal client
function initFalClient() {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY required");
  fal.config({ credentials: apiKey });
}

/**
 * Convert dialogue turns to Dia script format
 * Rules from docs:
 * - Use [S1] and [S2] tags for speakers
 * - Use (laughs), (sighs) etc for non-verbal
 */
function formatDialogueAsScript(dialogue: DialogueTurn[]): string {
  return dialogue
    .map((turn) => {
      const speakerTag = turn.speaker === "alex" ? "[S1]" : "[S2]";
      // Convert ElevenLabs audio tags [action] to Dia format (action)
      const text = turn.text
        .replace(/\[laughs\]/gi, "(laughs)")
        .replace(/\[sighs\]/gi, "(sighs)")
        .replace(/\[gasps\]/gi, "(gasps)")
        .replace(/\[whispers\]/gi, "(whispers)")
        .replace(/\[coughs\]/gi, "(coughs)")
        .replace(/\[clears throat\]/gi, "(clears throat)")
        .replace(/\[chuckles\]/gi, "(chuckles)")
        .replace(/\[groans\]/gi, "(groans)");
      return `${speakerTag} ${text}`;
    })
    .join(" ");
}

/**
 * Split dialogue into chunks targeting ~15 seconds each
 * Dia docs say: 5-20 seconds is optimal
 */
function chunkDialogue(
  dialogue: DialogueTurn[],
  turnsPerChunk = 6
): DialogueTurn[][] {
  const chunks: DialogueTurn[][] = [];
  for (let i = 0; i < dialogue.length; i += turnsPerChunk) {
    chunks.push(dialogue.slice(i, i + turnsPerChunk));
  }
  return chunks;
}

interface DiaFalOutput {
  audio: {
    url: string;
    content_type: string;
  };
}

/**
 * Generate a single audio clip from Dia via fal.ai
 * Returns the raw audio buffer
 */
async function generateSingleClip(
  text: string,
  clipIndex: number,
  totalClips: number
): Promise<ArrayBuffer> {
  console.log(
    `[Dia-Fal] Clip ${clipIndex + 1}/${totalClips}: "${text.slice(0, 60)}..." (${text.length} chars)`
  );

  const startTime = Date.now();

  const result = await fal.subscribe("fal-ai/dia-tts", {
    input: {
      text,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.map((log) => console.log(`[Dia-Fal] ${log.message}`));
      }
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(
    `[Dia-Fal] Clip ${clipIndex + 1} generated in ${(elapsed / 1000).toFixed(1)}s`
  );

  const output = result.data as DiaFalOutput;

  if (!output?.audio?.url) {
    throw new Error(`[Dia-Fal] No audio URL in response`);
  }

  console.log(
    `[Dia-Fal] Audio URL: ${output.audio.url}, type: ${output.audio.content_type}`
  );

  // Fetch the audio data
  const response = await fetch(output.audio.url);
  if (!response.ok) {
    throw new Error(`[Dia-Fal] Failed to fetch audio: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  console.log(`[Dia-Fal] Clip ${clipIndex + 1}: ${sizeKB} KB`);

  return audioBuffer;
}

/**
 * Concatenate MP3 buffers
 * Note: Simple concatenation works for MP3s with same encoding
 * For production, consider using ffmpeg for proper joining
 */
function concatenateMp3Buffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) throw new Error("No buffers");
  if (buffers.length === 1) return buffers[0];

  const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0);
  console.log(
    `[Dia-Fal] Concatenating ${buffers.length} MP3 clips, total: ${Math.round(totalLength / 1024)} KB`
  );

  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return combined.buffer;
}

/**
 * Main entry point: generate audio for dialogue
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  initFalClient();

  if (dialogue.length === 0) throw new Error("No dialogue");

  // Chunk the dialogue
  let chunks = chunkDialogue(dialogue, 6);
  if (DEBUG_MAX_CHUNKS > 0) {
    console.log(`[Dia-Fal] DEBUG: Limiting to ${DEBUG_MAX_CHUNKS} chunks`);
    chunks = chunks.slice(0, DEBUG_MAX_CHUNKS);
  }

  console.log(
    `[Dia-Fal] Generating ${chunks.length} clips for ${dialogue.length} turns...`
  );
  const startTime = Date.now();

  const scripts = chunks.map((c) => formatDialogueAsScript(c));

  // Generate all clips in parallel
  const clipPromises = scripts.map((script, i) =>
    generateSingleClip(script, i, scripts.length)
  );
  const buffers = await Promise.all(clipPromises);

  // Concatenate if multiple
  let finalBuffer: ArrayBuffer;
  if (buffers.length === 1) {
    finalBuffer = buffers[0];
  } else {
    console.log(`[Dia-Fal] Concatenating ${buffers.length} clips...`);
    finalBuffer = concatenateMp3Buffers(buffers);
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[Dia-Fal] Done in ${(elapsed / 1000).toFixed(1)}s, total size: ${Math.round(finalBuffer.byteLength / 1024)} KB`
  );

  return new Blob([finalBuffer], { type: "audio/mpeg" });
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
