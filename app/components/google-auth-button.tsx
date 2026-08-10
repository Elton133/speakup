"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";

export function GoogleAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  async function authenticate() {
    if (!isSupabaseConfigured) return;
    setBusy(true);
    const supabase = createClient();

    if (user && !user.is_anonymous) {
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }

    const options = { redirectTo: `${window.location.origin}/auth/callback?next=/community` };
    if (user?.is_anonymous) {
      await supabase.auth.linkIdentity({ provider: "google", options });
    } else {
      await supabase.auth.signInWithOAuth({ provider: "google", options });
    }
  }

  return (
    <>
      <button
        className="outline-button"
        disabled={busy || !isSupabaseConfigured}
        onClick={authenticate}
      >
        {busy
          ? "Connecting…"
          : user?.is_anonymous
            ? "Secure with Google"
            : user
              ? "Sign out"
              : "Continue with Google"}
      </button>
      <small>
        {!isSupabaseConfigured
          ? "Add your Supabase keys to enable Google registration."
          : user
            ? user.is_anonymous
              ? "Anonymous account — connect Google to keep it across devices."
              : `Signed in as ${user.email}`
            : "Your Google email is never shown on anonymous posts."}
      </small>
    </>
  );
}
