// Dia TTS via fal.ai
// Docs: https://fal.ai/models/fal-ai/dia-tts
// Max input: 10,000 characters per call (~10-13 min audio)
// Cost: $0.04 per 1000 characters

import { fal } from "@fal-ai/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import * as wavefile from "wavefile";
import { DialogueTurn } from "./types";

// Max characters per chunk (fal.ai limit is 10k, use 9k for safety)
const MAX_CHARS_PER_CHUNK = 9000;
// Target chunk sizes to encourage natural breakpoints and avoid model truncation
const TARGET_CHARS_PER_CHUNK = 6500;
const MIN_CHARS_PER_CHUNK = 2500;
const TARGET_SECONDS_PER_CHUNK = 45;
const MAX_SECONDS_PER_CHUNK = 60;
const MIN_SECONDS_PER_CHUNK = 25;

// Debug output directory
const DEBUG_OUTPUT_DIR = "/tmp/podgen-dia-chunks";

// Initialize fal client
function initFalClient() {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY required");
  fal.config({ credentials: apiKey });
}

/**
 * Strip ElevenLabs-style [tags] but KEEP Dia-style (nonverbals)
 * Dia supports: (laughs), (sighs), (clears throat), etc.
 */
function convertToDiaFormat(text: string): string {
  // Remove [bracketed tags] - these are ElevenLabs format
  let result = text.replace(/\[[^\]]+\]\s*/g, "");
  // Keep (parenthetical nonverbals) - Dia supports these!
  return result.trim();
}

function countWords(text: string): number {
  const cleaned = text.replace(/\[S\d+\]\s*/g, " ").trim();
  const trimmed = cleaned.replace(/\s+/g, " ").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function wordsToSeconds(words: number): number {
  return Math.round((words / 150) * 60);
}

function estimateDialogueWords(dialogue: DialogueTurn[]): number {
  return dialogue.reduce((sum, turn) => {
    return sum + countWords(convertToDiaFormat(turn.text));
  }, 0);
}

function estimateDialogueSeconds(dialogue: DialogueTurn[]): number {
  return wordsToSeconds(estimateDialogueWords(dialogue));
}

/**
 * Convert dialogue turns to Dia script format
 */
function formatDialogueAsScript(dialogue: DialogueTurn[]): string {
  return dialogue
    .map((turn) => {
      const speakerTag = turn.speaker === "alex" ? "[S1]" : "[S2]";
      const text = convertToDiaFormat(turn.text);
      return `${speakerTag} ${text}`;
    })
    .join(" ");
}

/**
 * Natural chunking: split at speaker boundaries, prefer sentence endings,
 * and keep under MAX_CHARS
 * Returns array of {dialogue: DialogueTurn[], script: string}
 */
function chunkDialogueNatural(dialogue: DialogueTurn[]): { dialogue: DialogueTurn[]; script: string }[] {
  const chunks: { dialogue: DialogueTurn[]; script: string }[] = [];
  let currentChunk: DialogueTurn[] = [];
  let currentScript = "";
  let totalScriptLength = 0;
  let totalWords = 0;
  let currentWords = 0;

  const isNaturalBreak = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    return /[.!?…]["')\]]?$/.test(trimmed);
  };

  // Pre-compute total length to avoid chunking short scripts
  for (const turn of dialogue) {
    const speakerTag = turn.speaker === "alex" ? "[S1]" : "[S2]";
    const text = convertToDiaFormat(turn.text);
    const turnScript = `${speakerTag} ${text}`;
    totalScriptLength += (totalScriptLength ? 1 : 0) + turnScript.length;
    totalWords += countWords(text);
  }

  const totalSeconds = wordsToSeconds(totalWords);
  if (totalScriptLength <= MAX_CHARS_PER_CHUNK && totalSeconds <= MAX_SECONDS_PER_CHUNK) {
    const script = formatDialogueAsScript(dialogue);
    return [{ dialogue, script }];
  }

  for (const turn of dialogue) {
    const speakerTag = turn.speaker === "alex" ? "[S1]" : "[S2]";
    const text = convertToDiaFormat(turn.text);
    const turnScript = `${speakerTag} ${text}`;
    const turnWords = countWords(text);

    // Check if adding this turn would exceed limit
    const wouldBe = currentScript + (currentScript ? " " : "") + turnScript;
    const wouldBeWords = currentWords + turnWords;
    const wouldBeSeconds = wordsToSeconds(wouldBeWords);

    if (
      (wouldBe.length > MAX_CHARS_PER_CHUNK || wouldBeSeconds > MAX_SECONDS_PER_CHUNK) &&
      currentChunk.length > 0
    ) {
      // Save current chunk and start new one
      chunks.push({ dialogue: currentChunk, script: currentScript });
      currentChunk = [turn];
      currentScript = turnScript;
      currentWords = turnWords;
      continue;
    }

    currentChunk.push(turn);
    currentScript = wouldBe;
    currentWords = wouldBeWords;

    // Prefer a natural breakpoint once we hit the target size
    if (
      ((currentScript.length >= TARGET_CHARS_PER_CHUNK &&
        currentScript.length >= MIN_CHARS_PER_CHUNK) ||
        (currentWords >= Math.round((TARGET_SECONDS_PER_CHUNK / 60) * 150) &&
          currentWords >= Math.round((MIN_SECONDS_PER_CHUNK / 60) * 150))) &&
      isNaturalBreak(text)
    ) {
      chunks.push({ dialogue: currentChunk, script: currentScript });
      currentChunk = [];
      currentScript = "";
      currentWords = 0;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({ dialogue: currentChunk, script: currentScript });
  }

  // Avoid tiny trailing chunks when possible
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1];
    const prev = chunks[chunks.length - 2];
    const lastWords = countWords(last.script);
    const prevWords = countWords(prev.script);
    if (
      (last.script.length < MIN_CHARS_PER_CHUNK ||
        wordsToSeconds(lastWords) < MIN_SECONDS_PER_CHUNK) &&
      prev.script.length + 1 + last.script.length <= MAX_CHARS_PER_CHUNK &&
      wordsToSeconds(prevWords + lastWords) <= MAX_SECONDS_PER_CHUNK
    ) {
      const mergedDialogue = [...prev.dialogue, ...last.dialogue];
      const mergedScript = `${prev.script} ${last.script}`;
      chunks.splice(chunks.length - 2, 2, { dialogue: mergedDialogue, script: mergedScript });
    }
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
 * Save debug files (script + audio) for a chunk
 */
async function saveDebugFiles(
  chunkIndex: number,
  script: string,
  audioBuffer: ArrayBuffer,
  timestamp: string
): Promise<void> {
  try {
    await mkdir(DEBUG_OUTPUT_DIR, { recursive: true });

    const scriptPath = path.join(DEBUG_OUTPUT_DIR, `${timestamp}_chunk${chunkIndex + 1}_script.txt`);
    const audioPath = path.join(DEBUG_OUTPUT_DIR, `${timestamp}_chunk${chunkIndex + 1}_audio.wav`);

    await writeFile(scriptPath, script, "utf-8");
    await writeFile(audioPath, Buffer.from(audioBuffer));

    console.log(`[Dia-Fal] Debug files saved: ${scriptPath}`);
  } catch (err) {
    console.warn(`[Dia-Fal] Failed to save debug files:`, err);
  }
}

/**
 * Generate audio for a single chunk
 */
async function generateChunk(
  script: string,
  chunkIndex: number,
  totalChunks: number,
  refAudioUrl?: string,
  refText?: string
): Promise<{ buffer: ArrayBuffer; url: string }> {
  // Log the FULL script for debugging
  console.log(`\n[Dia-Fal] ========== CHUNK ${chunkIndex + 1}/${totalChunks} ==========`);
  console.log(`[Dia-Fal] Script (${script.length} chars):`);
  console.log(`[Dia-Fal] ${script}`);
  console.log(`[Dia-Fal] ==========================================\n`);

  const startTime = Date.now();

  let result;
  if (refAudioUrl && refText) {
    // Use voice-clone endpoint for consistency with previous chunk
    console.log(`[Dia-Fal] Using voice-clone endpoint with reference audio`);
    result = await fal.subscribe("fal-ai/dia-tts/voice-clone", {
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
  } else {
    // First chunk - no reference
    result = await fal.subscribe("fal-ai/dia-tts", {
      input: { text: script },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.map((log) => console.log(`[Dia-Fal] ${log.message}`));
        }
      },
    });
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Dia-Fal] Chunk ${chunkIndex + 1} generated in ${(elapsed / 1000).toFixed(1)}s`);

  const output = result.data as DiaFalOutput;
  if (!output?.audio?.url) {
    throw new Error(`[Dia-Fal] No audio URL in response for chunk ${chunkIndex + 1}`);
  }

  console.log(`[Dia-Fal] Audio URL: ${output.audio.url}`);

  const response = await fetch(output.audio.url);
  if (!response.ok) {
    throw new Error(`[Dia-Fal] Failed to fetch audio: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  console.log(`[Dia-Fal] Chunk ${chunkIndex + 1}: ${Math.round(buffer.byteLength / 1024)} KB`);

  return { buffer, url: output.audio.url };
}

/**
 * Concatenate WAV buffers by extracting and combining PCM data
 */
function concatenateWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) throw new Error("No buffers");
  if (buffers.length === 1) return buffers[0];

  const waves = buffers.map((buf) => new wavefile.WaveFile(new Uint8Array(buf)));
  const base = waves[0];
  const numChannels = (base.fmt as { numChannels: number }).numChannels;
  const sampleRate = (base.fmt as { sampleRate: number }).sampleRate;
  const bitDepth = base.bitDepth;

  const sampleChunks: Float64Array[] = [];
  let totalSamples = 0;

  for (let i = 0; i < waves.length; i++) {
    const wav = waves[i];
    const wavChannels = (wav.fmt as { numChannels: number }).numChannels;
    const wavRate = (wav.fmt as { sampleRate: number }).sampleRate;
    if (wavChannels !== numChannels || wavRate !== sampleRate || wav.bitDepth !== bitDepth) {
      throw new Error(
        `[Dia-Fal] WAV format mismatch in chunk ${i + 1} (${wavChannels}ch/${wavRate}Hz/${wav.bitDepth})`
      );
    }

    const samples = wav.getSamples(true, Float64Array) as Float64Array;
    sampleChunks.push(samples);
    totalSamples += samples.length;
  }

  console.log(
    `[Dia-Fal] Concatenating ${sampleChunks.length} chunks with wavefile (${numChannels}ch, ${sampleRate}Hz, ${bitDepth}-bit)`
  );

  const combined = new Float64Array(totalSamples);
  let offset = 0;
  for (const chunk of sampleChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const output = new wavefile.WaveFile();
  output.fromScratch(numChannels, sampleRate, bitDepth, combined);
  const outBuffer = output.toBuffer();
  return (outBuffer.buffer as ArrayBuffer).slice(outBuffer.byteOffset, outBuffer.byteOffset + outBuffer.byteLength);
}

/**
 * Main entry point: generate audio for dialogue
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  initFalClient();

  if (dialogue.length === 0) throw new Error("No dialogue");

  // Temporarily disable chunking; send full script in one request
  const fullScript = formatDialogueAsScript(dialogue);
  const chunks = [{ dialogue, script: fullScript }];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log(`\n[Dia-Fal] ===== GENERATION START =====`);
  console.log(`[Dia-Fal] Total dialogue turns: ${dialogue.length}`);
  console.log(`[Dia-Fal] Estimated duration: ${estimateDialogueSeconds(dialogue)}s`);
  console.log(`[Dia-Fal] Split into ${chunks.length} chunks`);
  console.log(`[Dia-Fal] Debug output dir: ${DEBUG_OUTPUT_DIR}`);

  for (let i = 0; i < chunks.length; i++) {
    const chunkWords = estimateDialogueWords(chunks[i].dialogue);
    const chunkSeconds = wordsToSeconds(chunkWords);
    console.log(
      `[Dia-Fal] Chunk ${i + 1}: ${chunks[i].dialogue.length} turns, ` +
      `${chunks[i].script.length} chars, ${chunkWords} words (~${chunkSeconds}s)`
    );
  }

  const startTime = Date.now();
  const buffers: ArrayBuffer[] = [];
  let firstChunkUrl = "";
  let firstChunkScript = "";

  // Generate all chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    let result;
    if (i === 0) {
      // First chunk - no reference
      result = await generateChunk(chunk.script, i, chunks.length);
      firstChunkUrl = result.url;
      firstChunkScript = chunk.script;
    } else {
      // Subsequent chunks - use first chunk as reference for voice consistency
      result = await generateChunk(
        chunk.script,
        i,
        chunks.length,
        firstChunkUrl,
        firstChunkScript
      );
    }

    buffers.push(result.buffer);

    // Save debug files for each chunk
    await saveDebugFiles(i, chunk.script, result.buffer, timestamp);
  }

  // Concatenate WAV files
  let finalBuffer: ArrayBuffer;
  if (buffers.length === 1) {
    finalBuffer = buffers[0];
    console.log(`[Dia-Fal] Single chunk, no concatenation needed`);
  } else {
    console.log(`[Dia-Fal] Concatenating ${buffers.length} WAV files...`);
    finalBuffer = concatenateWavBuffers(buffers);

    // Also save the concatenated file for debugging
    try {
      await mkdir(DEBUG_OUTPUT_DIR, { recursive: true });
      const finalPath = path.join(DEBUG_OUTPUT_DIR, `${timestamp}_final_concatenated.wav`);
      await writeFile(finalPath, Buffer.from(finalBuffer));
      console.log(`[Dia-Fal] Final concatenated audio saved: ${finalPath}`);
    } catch (err) {
      console.warn(`[Dia-Fal] Failed to save final debug file:`, err);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Dia-Fal] ===== GENERATION COMPLETE =====`);
  console.log(`[Dia-Fal] Total time: ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`[Dia-Fal] Final size: ${Math.round(finalBuffer.byteLength / 1024)} KB`);
  console.log(`[Dia-Fal] Debug files in: ${DEBUG_OUTPUT_DIR}\n`);

  // Return as WAV (that's what Dia outputs)
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
