"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const PROJECT_MEDIA_BUCKET = "project-media";
const MAX_COVER_BYTES = 12 * 1024 * 1024;

function getFileExtension(file: File, fallback: string) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  return fallback;
}

export async function uploadActivityCover(
  formData: FormData,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in to upload files." };

    const file = formData.get("file");
    const draftSessionId = String(formData.get("draftSessionId") ?? "").trim() || "draft";

    if (!(file instanceof File)) {
      return { ok: false, error: "Choose a cover image to upload." };
    }
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "Cover must be an image file." };
    }
    if (file.size > MAX_COVER_BYTES) {
      return { ok: false, error: "Cover image must be under 12 MB." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = getFileExtension(file, "jpg");
    const storagePath = `${user.id.toLowerCase()}/activities/${draftSessionId}/cover/cover.${ext}`;

    const upload = await supabase.storage.from(PROJECT_MEDIA_BUCKET).upload(storagePath, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

    if (upload.error) {
      return { ok: false, error: upload.error.message };
    }

    const { data: publicUrl } = supabase.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(storagePath);
    return { ok: true, publicUrl: publicUrl.publicUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Cover upload failed.",
    };
  }
}
