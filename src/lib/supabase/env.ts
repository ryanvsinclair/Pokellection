/** Exact hostnames from .env templates — not substring checks (avoids false positives). */
const PLACEHOLDER_HOSTS = new Set([
  "your-project-ref.supabase.co",
  "YOUR_PROJECT_REF.supabase.co",
]);

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example → .env.local, fill in Supabase → Settings → API Keys, then restart `npm run dev`.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL (got "${url.slice(0, 40)}…"). ` +
        "It should look like https://YOUR_REF.supabase.co",
    );
  }

  if (!parsed.hostname.endsWith(".supabase.co")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL host "${parsed.hostname}" does not look like a Supabase project URL.`,
    );
  }

  if (PLACEHOLDER_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is still a template host (${parsed.hostname}). ` +
        "Set it to your project URL from Supabase → Settings → API, save .env.local, and restart `npm run dev`.",
    );
  }

  if (
    anonKey.includes("your-anon") ||
    anonKey === "your_anon_public_key" ||
    anonKey.length < 20
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY looks like a placeholder. Use the anon JWT (eyJ…) or publishable key (sb_publishable_…) from Supabase.",
    );
  }

  return { url, anonKey };
}

/** Log the underlying cause of Supabase `TypeError: fetch failed` in dev. */
export function logSupabaseFetchError(scope: string, error: { message: string; code?: string; cause?: unknown }) {
  const cause = error.cause;
  const causeMessage =
    cause instanceof Error ? cause.message : cause != null ? String(cause) : undefined;
  console.error(`[${scope}]`, error.message, error.code ?? "", causeMessage ?? "");
}
