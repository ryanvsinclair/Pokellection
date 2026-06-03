import { NextResponse } from "next/server";
import { assertManager } from "@/lib/admin-auth";
import { fetchCollectrShowcasePage } from "@/lib/collectr";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await assertManager(supabase);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; offset?: number };
  try {
    body = (await request.json()) as { url?: string; offset?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing showcase url" }, { status: 400 });
  }

  const offset = Number.isFinite(body.offset) ? Number(body.offset) : 0;

  try {
    const page = await fetchCollectrShowcasePage(url, offset);
    return NextResponse.json(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Collectr API request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
