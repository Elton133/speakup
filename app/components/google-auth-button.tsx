"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce?: string;
        context?: "signin" | "signup" | "use";
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type: "standard";
          theme: "outline";
          size: "large";
          text: "continue_with";
          shape: "rectangular";
          logo_alignment: "left";
          width: number;
        },
      ): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createNonce() {
  const rawNonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
  return {
    rawNonce,
    hashedNonce: [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join(""),
  };
}

export function GoogleAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<{ rawNonce: string; hashedNonce: string } | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential || !nonceRef.current) {
      setError("Google did not return a valid credential. Please try again.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.credential,
      nonce: nonceRef.current.rawNonce,
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }
    window.location.assign("/community");
  }, []);

  const renderGoogleButton = useCallback(async () => {
    if (!window.google || !buttonRef.current || !googleClientId || user) return;
    const nonce = await createNonce();
    nonceRef.current = nonce;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      nonce: nonce.hashedNonce,
      context: "signin",
    });
    buttonRef.current.replaceChildren();
    const width = Math.max(220, Math.min(400, buttonRef.current.clientWidth || 360));
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width,
    });
  }, [googleClientId, handleGoogleCredential, user]);

  useEffect(() => {
    if (window.google) void renderGoogleButton();
  }, [renderGoogleButton]);

  async function authenticateAnonymousOrSignOut() {
    if (!isSupabaseConfigured) return;
    setBusy(true);
    setError("");
    const supabase = createClient();

    if (user && !user.is_anonymous) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) setError(signOutError.message);
      setBusy(false);
      return;
    }

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const siteUrl = configuredSiteUrl || window.location.origin;
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback?next=/community` },
    });
    if (linkError) {
      setError(linkError.message);
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return <small>Add your Supabase keys to enable Google registration.</small>;
  }

  if (user) {
    return (
      <>
        <button className="outline-button" disabled={busy} onClick={authenticateAnonymousOrSignOut}>
          {busy ? "Connecting…" : user.is_anonymous ? "Continue with Google" : "Sign out"}
        </button>
        <small>
          {user.is_anonymous
            ? "Keep this anonymous account, its posts, and its streak across devices."
            : `Signed in as ${user.email}`}
        </small>
        {error && <small className="auth-error">{error}</small>}
      </>
    );
  }

  if (!googleClientId) {
    return <small>Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable direct Google sign-in.</small>;
  }

  return (
    <>
      <Script
        id="google-identity-services"
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => void renderGoogleButton()}
        onError={() => setError("Google sign-in could not be loaded.")}
      />
      <div className={busy ? "google-auth-button is-busy" : "google-auth-button"} ref={buttonRef} />
      <small>Google verifies your identity. Your email is never shown on anonymous posts.</small>
      {error && <small className="auth-error">{error}</small>}
    </>
  );
}
