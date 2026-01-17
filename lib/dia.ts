// Dia TTS via Replicate API
// Docs: https://github.com/nari-labs/dia
// Output: WAV file URL
// Optimal length: 5-20 seconds per clip

import Replicate from "replicate";
import { DialogueTurn } from "./types";

// Fixed seed for voice consistency across chunks
const VOICE_SEED = 42;

// Debug mode: only generate first N chunks (0 = all)
const DEBUG_MAX_CHUNKS = process.env.DEBUG_MAX_CHUNKS ? parseInt(process.env.DEBUG_MAX_CHUNKS) : 0;


/**
 * Convert dialogue turns to Dia script format
 * Rules from docs:
 * - Always begin with [S1]
 * - Always alternate between [S1] and [S2]
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
function chunkDialogue(dialogue: DialogueTurn[], turnsPerChunk = 6): DialogueTurn[][] {
  const chunks: DialogueTurn[][] = [];
  for (let i = 0; i < dialogue.length; i += turnsPerChunk) {
    chunks.push(dialogue.slice(i, i + turnsPerChunk));
  }
  return chunks;
}

/**
 * Generate a single audio clip from Dia
 * Returns the raw audio buffer
 *
 * Note: Voice cloning via audio_prompt requires audio_prompt_text which
 * gets prepended to output, causing duplicate speech. We rely on seed only.
 */
async function generateSingleClip(
  replicate: Replicate,
  text: string,
  clipIndex: number,
  totalClips: number
): Promise<ArrayBuffer> {
  console.log(`[Dia] Clip ${clipIndex + 1}/${totalClips}: "${text.slice(0, 60)}..." (${text.length} chars)`);

  const startTime = Date.now();

  const output = await replicate.run(
    "zsxkib/dia:2119e338ca5c0dacd3def83158d6c80d431f2ac1024146d8cca9220b74385599",
    {
      input: {
        text,
        temperature: 1.3,
        cfg_scale: 3,
        max_new_tokens: 4096,
        speed_factor: 1.0,
        seed: VOICE_SEED, // Fixed seed for voice consistency across chunks
      },
    }
  );

  const elapsed = Date.now() - startTime;
  console.log(`[Dia] Clip ${clipIndex + 1} generated in ${(elapsed / 1000).toFixed(1)}s`);

  // Output is a FileOutput object (extends ReadableStream) with .blob() and .url() methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileOutput = output as any;

  console.log(`[Dia] Output type: ${typeof output}, hasBlob: ${typeof fileOutput?.blob === 'function'}, hasUrl: ${typeof fileOutput?.url === 'function'}`);

  let audioBuffer: ArrayBuffer;

  if (typeof fileOutput?.blob === 'function') {
    // Preferred: use .blob() method
    console.log(`[Dia] Using FileOutput.blob()...`);
    const blob = await fileOutput.blob() as Blob;
    audioBuffer = await blob.arrayBuffer();
    console.log(`[Dia] Got blob: ${blob.size} bytes, type: ${blob.type}`);
  } else if (typeof fileOutput?.url === 'function') {
    // Fallback: fetch from URL
    const url = fileOutput.url();
    console.log(`[Dia] Fetching from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    audioBuffer = await response.arrayBuffer();
  } else if (output instanceof ReadableStream) {
    // Legacy fallback: read stream manually
    console.log(`[Dia] Reading stream manually...`);
    const reader = output.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    audioBuffer = combined.buffer;
  } else {
    throw new Error(`Unexpected output: ${typeof output}`);
  }

  // Log audio info
  const sizeKB = Math.round(audioBuffer.byteLength / 1024);
  const header = new Uint8Array(audioBuffer, 0, Math.min(44, audioBuffer.byteLength));
  const headerStr = Array.from(header.slice(0, 4)).map(b => String.fromCharCode(b)).join('');
  console.log(`[Dia] Clip ${clipIndex + 1}: ${sizeKB} KB, header starts with "${headerStr}"`);

  // If it's a WAV, log format details
  if (headerStr === "RIFF") {
    const view = new DataView(audioBuffer);
    const format = view.getUint16(20, true);
    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    console.log(`[Dia] WAV format: ${format === 1 ? 'PCM' : format === 3 ? 'Float' : format}, ${channels}ch, ${sampleRate}Hz, ${bitsPerSample}bit`);
  }

  return audioBuffer;
}

/**
 * Concatenate WAV buffers by appending PCM data
 */
function concatenateWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) throw new Error("No buffers");
  if (buffers.length === 1) return buffers[0];

  // Find "data" chunk in each WAV and extract PCM
  const pcmChunks: Uint8Array[] = [];
  let format = 1, channels = 1, sampleRate = 44100, bitsPerSample = 16;

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    const data = new Uint8Array(buf);
    const view = new DataView(buf);

    // Get format from first file
    if (i === 0) {
      format = view.getUint16(20, true);
      channels = view.getUint16(22, true);
      sampleRate = view.getUint32(24, true);
      bitsPerSample = view.getUint16(34, true);
    }

    // Find "data" chunk
    let offset = 12; // Skip RIFF header
    while (offset < data.length - 8) {
      const chunkId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "data") {
        const pcm = new Uint8Array(buf, offset + 8, chunkSize);
        pcmChunks.push(pcm);
        console.log(`[Dia] Buffer ${i}: found data chunk at ${offset}, size ${chunkSize}`);
        break;
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
  }

  // Combine PCM data
  const totalPcmLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
  console.log(`[Dia] Concatenating ${pcmChunks.length} chunks, total PCM: ${Math.round(totalPcmLength / 1024)} KB`);

  // Build new WAV
  const output = new ArrayBuffer(44 + totalPcmLength);
  const view = new DataView(output);
  const bytes = new Uint8Array(output);

  // RIFF header
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 36 + totalPcmLength, true);
  bytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  bytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // byte rate
  view.setUint16(32, channels * (bitsPerSample / 8), true); // block align
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  bytes.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, totalPcmLength, true);

  // PCM data
  let offset = 44;
  for (const pcm of pcmChunks) {
    bytes.set(pcm, offset);
    offset += pcm.length;
  }

  return output;
}

/**
 * Main entry point: generate audio for dialogue
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN required");
  if (dialogue.length === 0) throw new Error("No dialogue");

  const replicate = new Replicate({ auth: apiToken });

  // Chunk the dialogue
  let chunks = chunkDialogue(dialogue, 6);
  if (DEBUG_MAX_CHUNKS > 0) {
    console.log(`[Dia] DEBUG: Limiting to ${DEBUG_MAX_CHUNKS} chunks`);
    chunks = chunks.slice(0, DEBUG_MAX_CHUNKS);
  }

  console.log(`[Dia] Generating ${chunks.length} clips for ${dialogue.length} turns...`);
  const startTime = Date.now();

  const scripts = chunks.map(c => formatDialogueAsScript(c));
  const buffers: ArrayBuffer[] = [];

  // Generate all clips in parallel - seed provides voice consistency
  const clipPromises = scripts.map((script, i) =>
    generateSingleClip(replicate, script, i, scripts.length)
  );
  const clipBuffers = await Promise.all(clipPromises);
  buffers.push(...clipBuffers);

  // Concatenate if multiple
  let finalBuffer: ArrayBuffer;
  if (buffers.length === 1) {
    finalBuffer = buffers[0];
  } else {
    console.log(`[Dia] Concatenating ${buffers.length} clips...`);
    finalBuffer = concatenateWavBuffers(buffers);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Dia] Done in ${(elapsed / 1000).toFixed(1)}s, total size: ${Math.round(finalBuffer.byteLength / 1024)} KB`);

  return new Blob([finalBuffer], { type: "audio/wav" });
}

/**
 * Generate audio and return as base64 data URL
 */
export async function generateAudioDataUrl(dialogue: DialogueTurn[]): Promise<string> {
  const blob = await generateAudio(dialogue);
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:audio/wav;base64,${base64}`;
}
