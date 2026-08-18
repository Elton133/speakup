import { createClient as createAdminClient } from "@supabase/supabase-js";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createR2Client, getR2Config } from "../../../lib/cloudflare/r2";

export async function DELETE(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = await createClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tokenClient =
    bearer && url && anonKey
      ? createAdminClient(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${bearer}` } },
        })
      : null;
  const { data, error: authError } = tokenClient
    ? await tokenClient.auth.getUser(bearer)
    : await supabase.auth.getUser();
  if (authError || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Account deletion is not configured" }, { status: 503 });
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: media } = await admin
    .from("post_media")
    .select("object_key")
    .eq("uploader_id", data.user.id);
  if (media?.length) {
    try {
      const config = getR2Config();
      await createR2Client().send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: { Objects: media.map((item) => ({ Key: item.object_key as string })) },
        }),
      );
    } catch {
      // Account deletion must still proceed if object storage is temporarily unavailable.
    }
  }
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
