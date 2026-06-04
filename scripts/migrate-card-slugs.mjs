/**
 * One-time: remove "collectr" from all card slugs. Requires SUPABASE_SERVICE_ROLE_KEY.
 *
 *   node --env-file=.env.local scripts/migrate-card-slugs.mjs
 *   node --env-file=.env.local scripts/migrate-card-slugs.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(name) {
  try {
    const text = readFileSync(join(root, name), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(".env.local");

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Dynamic import of compiled logic — use inline duplicate for .mjs simplicity
const LEGACY_COLLECTR_INFIX = /-collectr-/g;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slugContainsCollectrBrand(slug) {
  return slug.toLowerCase().includes("collectr");
}

function stripCollectrFromSlug(slug) {
  return slug
    .replace(LEGACY_COLLECTR_INFIX, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCollectrIdentityFromTags(tags) {
  if (!tags?.length) return null;
  const tagged = tags.find((t) => t.startsWith("collectr:"));
  return tagged ? tagged.slice("collectr:".length) : null;
}

function buildListingSlugFromCard(card) {
  const language = card.language ?? "english";
  const identity = parseCollectrIdentityFromTags(card.tags);

  if (identity) {
    const [productId, identityCondition, productSubType, , gradeCompany] =
      identity.split("|");
    const variant = [card.printing ?? productSubType, gradeCompany]
      .map((part) => (part ? slugify(String(part)) : ""))
      .filter(Boolean)
      .join("-");
    return [
      slugify(card.title || "card"),
      productId,
      (card.condition || identityCondition || "nm").toLowerCase(),
      variant,
      language !== "english" ? slugify(language) : "",
    ]
      .filter(Boolean)
      .join("-");
  }

  const stripped = stripCollectrFromSlug(card.slug);
  if (!slugContainsCollectrBrand(stripped)) {
    return stripped || slugify(card.title) || "card";
  }

  const variant = card.printing ? slugify(card.printing) : "";
  return [
    slugify(card.title) || "card",
    card.condition.toLowerCase(),
    variant,
    language !== "english" ? slugify(language) : "",
  ]
    .filter(Boolean)
    .join("-");
}

function cardNeedsMigration(card) {
  if (!slugContainsCollectrBrand(card.slug)) return false;
  return buildListingSlugFromCard(card) !== card.slug;
}

const supabase = createClient(url, serviceKey);

const { data: cards, error } = await supabase
  .from("cards")
  .select("id, slug, title, tags, condition, printing, language")
  .order("created_at", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const taken = new Set(cards.map((c) => c.slug));
const plans = [];

for (const card of cards) {
  if (!cardNeedsMigration(card) && !slugContainsCollectrBrand(card.slug)) continue;

  let candidate = buildListingSlugFromCard(card);
  if (!candidate || slugContainsCollectrBrand(candidate)) {
    console.warn("Skip (could not build clean slug):", card.id, card.slug);
    continue;
  }

  let suffix = 2;
  const base = candidate;
  while (taken.has(candidate) && candidate !== card.slug) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  if (candidate === card.slug) {
    taken.add(candidate);
    continue;
  }

  taken.delete(card.slug);
  taken.add(candidate);
  plans.push({ id: card.id, oldSlug: card.slug, newSlug: candidate });
}

console.log(`Planned ${plans.length} slug update(s).${dryRun ? " (dry run)" : ""}`);
if (plans.length === 0) process.exit(0);

for (const plan of plans.slice(0, 10)) {
  console.log(`  ${plan.oldSlug} -> ${plan.newSlug}`);
}
if (plans.length > 10) console.log(`  ... and ${plans.length - 10} more`);

if (dryRun) process.exit(0);

for (const plan of plans) {
  const { error: updateError } = await supabase
    .from("cards")
    .update({ slug: plan.newSlug })
    .eq("id", plan.id);

  if (updateError) {
    console.error("Failed", plan.id, updateError.message);
    process.exit(1);
  }
}

console.log("Done.");
