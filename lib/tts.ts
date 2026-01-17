// Unified Text-to-Speech interface
// Supports multiple TTS backends with env-based switching

import * as elevenlabs from "./elevenlabs";
import * as diaReplicate from "./dia";
import * as diaFal from "./dia-fal";
import * as vibevoice from "./vibevoice";

import { DialogueTurn } from "./types";

// TTS Provider selection via environment variable
export type TTSProvider = "elevenlabs" | "dia-replicate" | "dia-fal" | "vibevoice";

function getProviderFromEnv(): TTSProvider {
  const provider = process.env.TTS_PROVIDER;

  // Support legacy USE_VIBEVOICE flag (confusingly named - was for Dia)
  if (!provider && process.env.USE_VIBEVOICE === "true") {
    return "dia-replicate";
  }

  if (
    provider === "vibevoice" ||
    provider === "dia-fal" ||
    provider === "dia-replicate" ||
    provider === "elevenlabs"
  ) {
    return provider;
  }

  return "elevenlabs"; // Default
}

/**
 * Get the current TTS provider name
 */
export function getCurrentProvider(): TTSProvider {
  return getProviderFromEnv();
}

/**
 * Generate audio from dialogue using the configured TTS provider
 */
export async function generateAudio(dialogue: DialogueTurn[]): Promise<Blob> {
  const provider = getCurrentProvider();
  console.log(`[TTS] Using provider: ${provider}`);

  switch (provider) {
    case "vibevoice":
      return vibevoice.generateAudio(dialogue);
    case "dia-fal":
      return diaFal.generateAudio(dialogue);
    case "dia-replicate":
      return diaReplicate.generateAudio(dialogue);
    case "elevenlabs":
    default:
      return elevenlabs.generateAudio(dialogue);
  }
}

/**
 * Generate audio and return as base64 data URL
 */
export async function generateAudioDataUrl(
  dialogue: DialogueTurn[]
): Promise<string> {
  const provider = getCurrentProvider();
  console.log(`[TTS] Using provider: ${provider}`);

  switch (provider) {
    case "vibevoice":
      return vibevoice.generateAudioDataUrl(dialogue);
    case "dia-fal":
      return diaFal.generateAudioDataUrl(dialogue);
    case "dia-replicate":
      return diaReplicate.generateAudioDataUrl(dialogue);
    case "elevenlabs":
    default:
      return elevenlabs.generateAudioDataUrl(dialogue);
  }
}

/**
 * Get estimated cost per 1000 characters for the current provider
 */
export function getEstimatedCostPer1KChars(): number {
  const provider = getCurrentProvider();

  switch (provider) {
    case "vibevoice":
      return 0.01; // ~$0.10 per run, rough estimate per 1K chars
    case "dia-fal":
      return 0.04; // $0.04 per 1K chars
    case "dia-replicate":
      return 0.005; // ~$0.029 per run, rough estimate
    case "elevenlabs":
    default:
      return 0.24; // ~$0.18-0.30 per 1K chars
  }
}
