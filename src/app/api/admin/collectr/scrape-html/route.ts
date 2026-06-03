import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import { scrapeCollectrPortfolioFromHtmlUrl } from "@/lib/collectr";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await assertManager(supabase);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; apiMessage?: string };
  try {
    body = (await request.json()) as { url?: string; apiMessage?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing showcase url" }, { status: 400 });
  }

  try {
    const result = await scrapeCollectrPortfolioFromHtmlUrl(url, body.apiMessage);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "HTML scrape failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
