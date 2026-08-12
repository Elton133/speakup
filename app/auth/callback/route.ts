import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const nextParam = url.searchParams.get("next") ?? "/community";
  const next = nextParam.startsWith("/") ? nextParam : "/community";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    return NextResponse.redirect(
      new URL(`/community?auth=error&reason=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const reason = providerError || "Google did not return an authorization code.";
  return NextResponse.redirect(
    new URL(`/community?auth=error&reason=${encodeURIComponent(reason)}`, url.origin),
  );
}
