import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

async function moderatorClient() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: allowed } = await supabase.rpc("is_moderator");
  return allowed ? { supabase, user: auth.user } : null;
}

export async function GET(request: Request) {
  const context = await moderatorClient();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = new URL(request.url).searchParams.get("status") || "open";
  let query = context.supabase
    .from("reports")
    .select(
      "id,reason,details,status,created_at,reporter:profiles!reports_reporter_id_fkey(display_name),post:posts!reports_post_id_fkey(id,body,topic,created_at,moderation_status,author:profiles!posts_author_id_fkey(id,display_name,account_status))",
    )
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data });
}

export async function PATCH(request: Request) {
  const context = await moderatorClient();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json()) as { reportId?: string; action?: string; note?: string };
  if (!body.reportId || !body.action) {
    return NextResponse.json({ error: "Missing report or action" }, { status: 400 });
  }

  const { data: report, error: reportError } = await context.supabase
    .from("reports")
    .select("id,post_id,post:posts!reports_post_id_fkey(author_id)")
    .eq("id", body.reportId)
    .single();
  if (reportError || !report)
    return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const post = report.post as unknown as { author_id: string };
  const action = body.action;
  if (action === "hidden" || action === "removed") {
    const { error } = await context.supabase.rpc("moderate_post", {
      target_post_id: report.post_id,
      new_status: action,
      reason: body.note || "Community guidelines review",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (action === "warned" || action === "suspended") {
    const { error } = await context.supabase.rpc("moderate_user", {
      target_user_id: post.author_id,
      new_status: action,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reportStatus =
    action === "reviewing" ? "reviewing" : action === "dismissed" ? "dismissed" : "resolved";
  const { error: updateError } = await context.supabase
    .from("reports")
    .update({ status: reportStatus })
    .eq("id", body.reportId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: auditError } = await context.supabase.from("moderation_actions").insert({
    moderator_id: context.user.id,
    report_id: body.reportId,
    post_id: report.post_id,
    target_user_id: post.author_id,
    action,
    note: body.note || null,
  });
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
