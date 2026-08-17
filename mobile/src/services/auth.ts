import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL("auth/callback");
  const { data: current } = await supabase.auth.getUser();
  const request = {
    provider: "google" as const,
    options: { redirectTo, skipBrowserRedirect: true },
  };
  const { data, error } = current.user?.is_anonymous
    ? await supabase.auth.linkIdentity(request)
    : await supabase.auth.signInWithOAuth(request);
  if (error || !data.url) throw error || new Error("Google sign-in could not start.");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new Error("Google sign-in was cancelled.");
  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("Google did not return an authorization code.");
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}
