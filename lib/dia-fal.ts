// Dia TTS via fal.ai
// Docs: https://fal.ai/models/fal-ai/dia-tts
// Max input: 10,000 characters per call
// Cost: $0.04 per 1000 characters

import { fal } from "@fal-ai/client";
import { DialogueTurn } from "./types";

// Max characters per chunk (fal.ai limit is 10k, use 9k for safety)
const MAX_CHARS_PER_CHUNK = 9000;

// Initialize fal client
function initFalClient() {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY required");
  fal.config({ credentials: apiKey });
}

/**
 * Strip ALL tags/annotations from text
 * Dia works better with plain text
 */
function stripAllAnnotations(text: string): string {
  return text
    .replace(/\[[^\]]+\]\s*/g, "")  // Remove [any bracketed tags]
    .replace(/\([^)]+\)\s*/g, "")    // Remove (any parenthetical actions)
    .trim();
}

/**
 * Convert dialogue turns to Dia script format
 */
function formatDialogueAsScript(dialogue: DialogueTurn[]): string {
  return dialogue
    .map((turn) => {
      const speakerTag = turn.speaker === "alex" ? "[S1]" : "[S2]";
      const text = stripAllAnnotations(turn.text);
      return `${speakerTag} ${text}`;
    })
    .join(" ");
}

/**
 * Smart chunking: split at speaker boundaries, keeping under MAX_CHARS
 * Returns array of {dialogue: DialogueTurn[], script: string}
 */
function chunkDialogueSmart(dialogue: DialogueTurn[]): { dialogue: DialogueTurn[]; script: string }[] {
  const chunks: { dialogue: DialogueTurn[]; script: string }[] = [];
  let currentChunk: DialogueTurn[] = [];
  let currentScript = "";

  for (const turn of dialogue) {
    const speakerTag = turn.speaker === "alex" ? "[S1]" : "[S2]";
    const text = stripAllAnnotations(turn.text);
    const turnScript = `${speakerTag} ${text}`;

    // Check if adding this turn would exceed limit
    const wouldBe = currentScript + (currentScript ? " " : "") + turnScript;

    if (wouldBe.length > MAX_CHARS_PER_CHUNK && currentChunk.length > 0) {
      // Save current chunk and start new one
      chunks.push({ dialogue: currentChunk, script: currentScript });
      currentChunk = [turn];
      currentScript = turnScript;
    } else {
      currentChunk.push(turn);
      currentScript = wouldBe;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({ dialogue: currentChunk, script: currentScript });
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
 * Generate audio WITHOUT voice reference (for first chunk)
 */
async function generateFirstClip(
  script: string,
  totalClips: number
): Promise<{ buffer: ArrayBuffer; url: string }> {
  console.log(`[Dia-Fal] Clip 1/${totalClips}: "${script.slice(0, 60)}..." (${script.length} chars)`);

  const startTime = Date.now();

  const result = await fal.subscribe("fal-ai/dia-tts", {
    input: { text: script },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.map((log) => console.log(`[Dia-Fal] ${log.message}`));
      }
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(`[Dia-Fal] Clip 1 generated in ${(elapsed / 1000).toFixed(1)}s`);

  const output = result.data as DiaFalOutput;
  if (!output?.audio?.url) {
    throw new Error(`[Dia-Fal] No audio URL in response`);
  }

  console.log(`[Dia-Fal] Audio URL: ${output.audio.url}`);

  const response = await fetch(output.audio.url);
  if (!response.ok) {
    throw new Error(`[Dia-Fal] Failed to fetch audio: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  console.log(`[Dia-Fal] Clip 1: ${Math.round(buffer.byteLength / 1024)} KB`);

  return { buffer, url: output.audio.url };
}

/**
 * Generate audio WITH voice reference (for subsequent chunks)
 * Uses the voice-clone endpoint for consistency
 */
async function generateClipWithReference(
  script: string,
  clipIndex: number,
  totalClips: number,
  refAudioUrl: string,
  refText: string
): Promise<ArrayBuffer> {
  console.log(`[Dia-Fal] Clip ${clipIndex + 1}/${totalClips}: "${script.slice(0, 60)}..." (${script.length} chars)`);
  console.log(`[Dia-Fal] Using voice reference for consistency`);

  const startTime = Date.now();

  // Use voice-clone endpoint with reference
  const result = await fal.subscribe("fal-ai/dia-tts/voice-clone", {
    input: {
      text: script,
      ref_audio_url: refAudioUrl,
      ref_text: refText,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.map((log) => console.log(`[Dia-Fal] ${log.message}`));
      }
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(`[Dia-Fal] Clip ${clipIndex + 1} generated in ${(elapsed / 1000).toFixed(1)}s`);

  const output = result.data as DiaFalOutput;
  if (!output?.audio?.url) {
    throw new Error(`[Dia-Fal] No audio URL in response`);
  }

  const response = await fetch(output.audio.url);
  if (!response.ok) {
    throw new Error(`[Dia-Fal] Failed to fetch audio: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  console.log(`[Dia-Fal] Clip ${clipIndex + 1}: ${Math.round(buffer.byteLength / 1024)} KB`);

  return buffer;
}

/**
 * Concatenate WAV buffers by extracting and combining PCM data
 */
function concatenateWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) throw new Error("No buffers");
  if (buffers.length === 1) return buffers[0];

  // Extract PCM data from each WAV
  const pcmChunks: Uint8Array[] = [];
  let format = 1, channels = 1, sampleRate = 44100, bitsPerSample = 16;

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    const data = new Uint8Array(buf);
    const view = new DataView(buf);

    // Verify WAV header
    const header = String.fromCharCode(data[0], data[1], data[2], data[3]);
    if (header !== "RIFF") {
      console.warn(`[Dia-Fal] Buffer ${i} is not WAV (header: ${header}), skipping`);
      continue;
    }

    // Get format from first file
    if (i === 0) {
      format = view.getUint16(20, true);
      channels = view.getUint16(22, true);
      sampleRate = view.getUint32(24, true);
      bitsPerSample = view.getUint16(34, true);
      console.log(`[Dia-Fal] WAV format: ${format === 1 ? 'PCM' : format === 3 ? 'Float' : format}, ${channels}ch, ${sampleRate}Hz, ${bitsPerSample}bit`);
    }

    // Find "data" chunk
    let offset = 12; // Skip RIFF header
    while (offset < data.length - 8) {
      const chunkId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "data") {
        const pcm = new Uint8Array(buf, offset + 8, chunkSize);
        pcmChunks.push(pcm);
        console.log(`[Dia-Fal] Chunk ${i + 1}: ${Math.round(chunkSize / 1024)} KB PCM data`);
        break;
      }
      offset += 8 + chunkSize + (chunkSize % 2); // Pad to even boundary
    }
  }

  if (pcmChunks.length === 0) {
    throw new Error("[Dia-Fal] No valid WAV data found");
  }

  // Combine PCM data
  const totalPcmLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
  console.log(`[Dia-Fal] Concatenating ${pcmChunks.length} chunks, total PCM: ${Math.round(totalPcmLength / 1024)} KB`);

  // Build new WAV file
  const wavBuffer = new ArrayBuffer(44 + totalPcmLength);
  const wavView = new DataView(wavBuffer);
  const wavBytes = new Uint8Array(wavBuffer);

  // RIFF header
  wavBytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  wavView.setUint32(4, 36 + totalPcmLength, true); // File size - 8
  wavBytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  wavBytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  wavView.setUint32(16, 16, true); // Chunk size
  wavView.setUint16(20, format, true); // Audio format
  wavView.setUint16(22, channels, true); // Channels
  wavView.setUint32(24, sampleRate, true); // Sample rate
  wavView.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // Byte rate
  wavView.setUint16(32, channels * (bitsPerSample / 8), true); // Block align
  wavView.setUint16(34, bitsPerSample, true); // Bits per sample

  // data chunk
  wavBytes.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  wavView.setUint32(40, totalPcmLength, true); // Data size

  // PCM data
  let offset = 44;
  for (const pcm of pcmChunks) {
    wavBytes.set(pcm, offset);
    offset += pcm.length;
  }

  return wavBuffer;
}

/**
 * Main entry point: generate audio for dialogue
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  initFalClient();

  if (dialogue.length === 0) throw new Error("No dialogue");

  // Smart chunk at speaker boundaries
  const chunks = chunkDialogueSmart(dialogue);
  console.log(`[Dia-Fal] Split into ${chunks.length} chunks for ${dialogue.length} turns`);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Dia-Fal] Chunk ${i + 1}: ${chunks[i].dialogue.length} turns, ${chunks[i].script.length} chars`);
  }

  const startTime = Date.now();
  const buffers: ArrayBuffer[] = [];

  // Generate first chunk (no reference)
  const first = await generateFirstClip(chunks[0].script, chunks.length);
  buffers.push(first.buffer);

  // Generate remaining chunks with voice reference
  if (chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const buffer = await generateClipWithReference(
        chunks[i].script,
        i,
        chunks.length,
        first.url,        // Reference audio URL from first chunk
        chunks[0].script  // Reference text (transcript of first chunk)
      );
      buffers.push(buffer);
    }
  }

  // Concatenate WAV files
  let finalBuffer: ArrayBuffer;
  if (buffers.length === 1) {
    finalBuffer = buffers[0];
  } else {
    finalBuffer = concatenateWavBuffers(buffers);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Dia-Fal] Done in ${(elapsed / 1000).toFixed(1)}s, total size: ${Math.round(finalBuffer.byteLength / 1024)} KB`);

  // Return as WAV (that's what Dia actually outputs)
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
