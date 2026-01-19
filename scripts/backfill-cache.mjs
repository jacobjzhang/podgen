import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache");
const ENV_PATH = path.join(ROOT, ".env.local");

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  const lines = fs.readFileSync(ENV_PATH, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function hash(data) {
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

function getNewsKey(interests) {
  return `news_${hash([...interests].sort().join(","))}.json`;
}

function getEnrichedKey(newsItems) {
  const newsHash = hash(
    newsItems.map((n) => `${n.url}:${n.title}:${n.snippet}`).join("|")
  );
  return `enriched_${newsHash}.json`;
}

function getAudioKey(dialogue) {
  return hash(dialogue.map((d) => `${d.speaker}:${d.text}`).join("|"));
}

function isUrl(value) {
  return /^https?:\/\//i.test(value) || /^www\./i.test(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function truncateText(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "…";
}

async function generateMetadata({ topics, inputSummary, dialogueSample, apiKey }) {
  if (!apiKey) return null;

  const system = `You generate short podcast metadata.
Return ONLY JSON with keys "title" and "excerpt".
- title: <= 60 characters, punchy, clear.
- excerpt: 1-2 sentences, <= 160 characters, enticing but accurate.
No emojis, no quotes.`;

  const user = `Topics:
${topics || "N/A"}

Input summary:
${inputSummary || "N/A"}

Dialogue sample:
${dialogueSample || "N/A"}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[OpenAI] metadata error:", error);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    const title = String(parsed.title || "").trim();
    const excerpt = String(parsed.excerpt || "").trim();
    if (!title || !excerpt) return null;
    return {
      title: truncateText(title, 60),
      excerpt: truncateText(excerpt, 160),
    };
  } catch (err) {
    console.error("[OpenAI] metadata parse error:", err);
    return null;
  }
}

async function ensureBucket(supabase, bucket) {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (data && !error) return;
  const create = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  if (create.error && create.error.message !== "Bucket already exists") {
    throw create.error;
  }
}

async function uploadAudio(supabase, bucket, audioId, filePath, mime) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath);
  const storagePath = `${audioId}${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: mime,
      upsert: true,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

async function main() {
  loadEnv();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)"
    );
  }

  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const skipUpload = args.has("--skip-upload");
  const skipMetadata = args.has("--skip-metadata");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
  const bucket = "episodes";

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  if (!openaiApiKey && !skipMetadata) {
    console.warn("[Backfill] OPENAI_API_KEY missing; metadata generation will be skipped.");
  }

  if (!fs.existsSync(CACHE_DIR)) {
    throw new Error("No .cache directory found");
  }

  const files = fs.readdirSync(CACHE_DIR);
  const episodeFiles = files.filter(
    (f) => f.startsWith("episode_") && f.endsWith(".json")
  );

  const dialogueFiles = files.filter(
    (f) => f.startsWith("dialogue_") && f.endsWith(".json")
  );

  const dialogueMap = new Map();
  for (const file of dialogueFiles) {
    const fp = path.join(CACHE_DIR, file);
    const dialogue = readJson(fp);
    const audioKey = getAudioKey(dialogue);
    const speakerMatch = file.match(/_s(\d+)\.json$/);
    const speakerCount = speakerMatch ? Number(speakerMatch[1]) : null;
    dialogueMap.set(audioKey, { dialogue, speakerCount });
  }

  if (!skipUpload && !dryRun) {
    await ensureBucket(supabase, bucket);
  }

  let processed = 0;
  for (const file of episodeFiles) {
    if (limit && processed >= limit) break;
    const fp = path.join(CACHE_DIR, file);
    const meta = readJson(fp);
    const audioId = meta.id;

    const audioMp3 = path.join(CACHE_DIR, `audio_${audioId}.mp3`);
    const audioWav = path.join(CACHE_DIR, `audio_${audioId}.wav`);
    const audioPath = fs.existsSync(audioMp3)
      ? audioMp3
      : fs.existsSync(audioWav)
      ? audioWav
      : null;

    const audioMime = audioPath?.endsWith(".wav")
      ? "audio/wav"
      : "audio/mpeg";

    let audioUrl = null;
    if (audioPath && !skipUpload && !dryRun) {
      audioUrl = await uploadAudio(supabase, bucket, audioId, audioPath, audioMime);
    }

    const interests = Array.isArray(meta.interests) ? meta.interests : [];
    const title =
      interests.length > 0 ? interests.join(", ") : "Untitled Episode";
    const inputSummary =
      interests.length > 0 ? interests.join(", ") : null;

    const dialogueInfo = dialogueMap.get(audioId);
    const speakerCount =
      dialogueInfo?.speakerCount ||
      (dialogueInfo?.dialogue
        ? new Set(dialogueInfo.dialogue.map((d) => d.speaker)).size
        : 3);

    const episodeRow = {
      audio_cache_key: audioId,
      owner_user_id: null,
      title,
      excerpt: null,
      audio_url: audioUrl,
      audio_format: audioPath ? audioMime : null,
      audio_duration_seconds: meta.duration || null,
      tts_provider: null,
      speaker_count: speakerCount,
      status: audioPath ? "ready" : "failed",
      public: false,
      share_slug: null,
      input_summary: inputSummary,
      news_count: meta.newsCount || null,
      dialogue_turns: meta.dialogueTurns || null,
    };

    if (dryRun) {
      console.log(`[DRY RUN] episode ${audioId}`, episodeRow);
      processed++;
      continue;
    }

    const { data: episodeData, error: episodeError } = await supabase
      .from("episodes")
      .upsert(episodeRow, { onConflict: "audio_cache_key" })
      .select("id")
      .single();

    if (episodeError) {
      console.error(`[ERROR] episode ${audioId}:`, episodeError);
      continue;
    }

    const episodeId = episodeData.id;

    // Clear existing sources
    await supabase.from("episode_sources").delete().eq("episode_id", episodeId);

    // Attach sources from news cache when possible
    let sources = [];
    let topicsSummary = "";
    const newsKey = getNewsKey(interests);
    const newsPath = path.join(CACHE_DIR, newsKey);
    if (fs.existsSync(newsPath)) {
      const newsItems = readJson(newsPath);
      const enrichedPath = path.join(CACHE_DIR, getEnrichedKey(newsItems));
      let enrichedMap = new Map();
      if (fs.existsSync(enrichedPath)) {
        const enrichedItems = readJson(enrichedPath);
        enrichedMap = new Map(
          enrichedItems.map((item) => [item.url || item.title, item])
        );
      }

      const topicLines = newsItems.map((item) => {
        const summary = item.detailedSummary || item.snippet || "";
        return `- ${item.title}: ${truncateText(summary, 180)}`;
      });
      topicsSummary = topicLines.join("\n");

      sources = newsItems.map((item) => {
        const enriched = enrichedMap.get(item.url || item.title);
        return {
          episode_id: episodeId,
          source_type: "news",
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          detailed_summary: enriched?.detailedSummary || item.snippet,
        };
      });
    } else if (interests.length > 0) {
      topicsSummary = interests.map((value) => `- ${value}`).join("\n");
      sources = interests.map((value) => {
        const url = isUrl(value) ? value : null;
        return {
          episode_id: episodeId,
          source_type: url ? "url" : "prompt",
          title: url ? "User-provided URL" : "User prompt",
          url,
          snippet: url ? `User provided URL: ${value}` : value,
          detailed_summary: url ? null : value,
        };
      });
    }

    if (sources.length > 0) {
      const { error: sourcesError } = await supabase
        .from("episode_sources")
        .insert(sources);
      if (sourcesError) {
        console.error(`[ERROR] sources ${audioId}:`, sourcesError);
      }
    }

    if (!skipMetadata) {
      const dialogueSample = dialogueInfo?.dialogue
        ? dialogueInfo.dialogue
            .slice(0, 6)
            .map((turn) => {
              return `${String(turn.speaker).toUpperCase()}: ${truncateText(String(turn.text || ""), 120)}`;
            })
            .join("\n")
        : "";

      const metaResult = await generateMetadata({
        topics: topicsSummary,
        inputSummary,
        dialogueSample,
        apiKey: openaiApiKey,
      });

      if (metaResult && !dryRun) {
        const { error: updateError } = await supabase
          .from("episodes")
          .update({
            title: metaResult.title,
            excerpt: metaResult.excerpt,
          })
          .eq("audio_cache_key", audioId);
        if (updateError) {
          console.error(`[ERROR] metadata update ${audioId}:`, updateError);
        }
      }
    }

    processed++;
    console.log(`[OK] Backfilled episode ${audioId}`);
  }

  console.log(`Done. Episodes processed: ${processed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
