// ---------------------------------------------------------------------------
// /api/upload/guard-photo
//
// POST a single image file (multipart/form-data, field name "file").
// We upload it into the Supabase Storage 'guard-photos' bucket using the
// service_role key, then return its public URL.
//
// The bucket and read policy were set up by `supabase-storage-bucket.sql`.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE      = 5 * 1024 * 1024;   // matches the bucket limit

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Multipart parse — Next.js exposes this directly on Request in app router.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded under 'file' field" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { ok: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.` },
      { status: 400 }
    );
  }

  // Compose a stable, collision-resistant filename. We include the original
  // extension so MIME-sniffing tools (and humans browsing the bucket) see
  // recognizable filenames.
  const ext = (() => {
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/png")  return "png";
    if (file.type === "image/webp") return "webp";
    return "bin";
  })();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const supabase = getSupabase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabase
    .storage
    .from("guard-photos")
    .upload(filename, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (upErr) {
    // Most common cause: bucket doesn't exist. Surface a clear message.
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${upErr.message}. Did you run supabase-storage-bucket.sql?` },
      { status: 500 }
    );
  }

  // Public URL for the bucket. Stored on the BLE device row.
  const { data: pub } = supabase.storage.from("guard-photos").getPublicUrl(filename);

  return NextResponse.json({ ok: true, url: pub.publicUrl, filename });
}
