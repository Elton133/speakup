import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { createR2Client, getR2Config } from "../../../../lib/cloudflare/r2";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
]);

function safeExtension(fileName: string, mimeType: string) {
  const fromName = fileName.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  if (fromName) return fromName;
  return mimeType.startsWith("video/") ? "mp4" : "webm";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { fileName?: string; mimeType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fileName = body.fileName?.trim() || "recording.webm";
  const mimeType = body.mimeType?.toLowerCase().split(";")[0] || "";
  const size = Number(body.size);
  const kind = mimeType.startsWith("video/")
    ? "video"
    : mimeType.startsWith("audio/")
      ? "audio"
      : null;
  const maxSize = kind === "video" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;

  if (!kind || !ALLOWED_TYPES.has(mimeType))
    return NextResponse.json(
      { error: "Use an MP4/WebM video or MP3/M4A/WAV/WebM audio file." },
      { status: 415 },
    );
  if (!Number.isFinite(size) || size <= 0 || size > maxSize)
    return NextResponse.json(
      {
        error: `${kind === "video" ? "Videos" : "Audio files"} must be under ${kind === "video" ? "100 MB" : "25 MB"}.`,
      },
      { status: 413 },
    );

  try {
    const config = getR2Config();
    const extension = safeExtension(fileName, mimeType);
    const key = `community/${auth.user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      createR2Client(),
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: mimeType,
        ContentLength: size,
      }),
      { expiresIn: 300 },
    );
    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl: `${config.publicBaseUrl}/${key}`,
      kind,
      mimeType,
      size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloudflare R2 is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
