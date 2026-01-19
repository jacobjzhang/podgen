import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_API_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
  );
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignore if cookies are read-only in this context.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignore if cookies are read-only in this context.
        }
      },
    },
  });
}
