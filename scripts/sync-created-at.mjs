import fs from "fs";
import path from "path";
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function main() {
  loadEnv();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)"
    );
  }

  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

  if (!fs.existsSync(CACHE_DIR)) {
    throw new Error("No .cache directory found");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const files = fs.readdirSync(CACHE_DIR);
  const episodeFiles = files.filter(
    (f) => f.startsWith("episode_") && f.endsWith(".json")
  );

  let processed = 0;
  for (const file of episodeFiles) {
    if (limit && processed >= limit) break;
    const fp = path.join(CACHE_DIR, file);
    const meta = readJson(fp);
    const audioId = meta.id;
    const createdAt = meta.createdAt;

    if (!audioId || !createdAt) {
      console.warn(`[WARN] Missing id/createdAt in ${file}`);
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] ${audioId} -> ${createdAt}`);
      processed++;
      continue;
    }

    const { error } = await supabase
      .from("episodes")
      .update({ created_at: createdAt })
      .eq("audio_cache_key", audioId);

    if (error) {
      console.error(`[ERROR] ${audioId}:`, error);
    } else {
      console.log(`[OK] Updated created_at for ${audioId} -> ${createdAt}`);
    }

    processed++;
  }

  console.log(`Done. Episodes processed: ${processed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
