"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { appendCardPhotoPaths } from "@/app/admin/cards/actions";
import {
  AdminIconButton,
  IconCamera,
  IconSpinner,
} from "@/components/admin/AdminActionIcons";
import { uploadCardPhotoFiles } from "@/lib/card-photos";
import { createClient } from "@/lib/supabase/client";

interface Props {
  cardId: string;
  cardSlug: string;
  photoCount: number;
}

export function CardQuickPhotoButton({ cardId, cardSlug, photoCount }: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoLabel =
    photoCount > 0 ? `Add photo (${photoCount} in gallery)` : "Add photo";

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    setMenuOpen(false);
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const upload = await uploadCardPhotoFiles(supabase, cardSlug, Array.from(files));
    if ("error" in upload) {
      setError(upload.error);
      setUploading(false);
      return;
    }

    const result = await appendCardPhotoPaths(cardId, upload.paths);
    if (!result.ok) {
      setError(result.error);
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  }

  return (
    <div className="relative inline-block">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <AdminIconButton
        label={uploading ? "Uploading photo" : photoLabel}
        disabled={uploading}
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="relative"
      >
        {uploading ? <IconSpinner /> : <IconCamera />}
        {photoCount > 0 && !uploading && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-white">
            {photoCount > 9 ? "9+" : photoCount}
          </span>
        )}
      </AdminIconButton>

      {menuOpen && !uploading && (
        <>
          <button
            type="button"
            aria-label="Close photo menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-medium hover:bg-surface"
              onClick={() => cameraInputRef.current?.click()}
            >
              Take photo
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-medium hover:bg-surface"
              onClick={() => galleryInputRef.current?.click()}
            >
              Choose from gallery
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="absolute left-0 top-full z-20 mt-1 max-w-[12rem] text-[10px] text-primary">
          {error}
        </p>
      )}
    </div>
  );
}
