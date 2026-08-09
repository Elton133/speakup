import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: allowed } = await supabase.rpc("is_moderator");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const input = (await request.json()) as { title?: string; message?: string; url?: string };
  const title = input.title?.trim();
  const message = input.message?.trim();
  const destinationUrl = input.url?.trim() || "/community?view=notices";
  if (
    !title ||
    !message ||
    title.length > 80 ||
    message.length > 240 ||
    !destinationUrl.startsWith("/")
  ) {
    return NextResponse.json({ error: "Invalid announcement" }, { status: 400 });
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceKey)
    return NextResponse.json({ error: "Server notifications are not configured" }, { status: 503 });
  const admin = createAdminClient(projectUrl, serviceKey, { auth: { persistSession: false } });
  const { data: profiles, error: profileError } = await admin.from("profiles").select("id");
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { error: announcementError } = await admin.from("announcements").insert({
    author_id: auth.user.id,
    title,
    message,
    destination_url: destinationUrl,
  });
  if (announcementError)
    return NextResponse.json({ error: announcementError.message }, { status: 500 });
  if (profiles?.length) {
    const { error } = await admin.from("notifications").insert(
      profiles.map((profile) => ({
        recipient_id: profile.id,
        actor_id: auth.user!.id,
        kind: "community",
        message: `${title}: ${message}`.slice(0, 240),
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  let pushed = 0;
  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id,subscription");
    const results = await Promise.allSettled(
      (subscriptions || []).map(async (row) => {
        try {
          await webpush.sendNotification(
            row.subscription as webpush.PushSubscription,
            JSON.stringify({
              title,
              body: message,
              url: destinationUrl,
              tag: "speakup-announcement",
            }),
          );
          pushed += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410)
            await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
      }),
    );
    void results;
  }
  return NextResponse.json({ ok: true, recipients: profiles?.length || 0, pushed });
}
