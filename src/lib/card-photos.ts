import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export function cardPhotoStoragePath(slug: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "photo.jpg";
  return `cards/${slug}/${crypto.randomUUID()}-${safeName}`;
}

export async function uploadCardPhotoFiles(
  supabase: Client,
  slug: string,
  files: File[],
): Promise<{ paths: string[] } | { error: string }> {
  const paths: string[] = [];

  for (const file of files) {
    const path = cardPhotoStoragePath(slug, file.name);
    const { error } = await supabase.storage.from("card-photos").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) return { error: error.message };
    paths.push(path);
  }

  return { paths };
}
