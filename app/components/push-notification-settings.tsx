"use client";

import { useEffect, useState } from "react";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => registration.pushManager.getSubscription())
      .then(setSubscription)
      .catch(() => setMessage("Push notifications could not be initialized."));
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return setMessage("Push notifications are not configured yet.");
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      const next = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      });
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Sign in before enabling push notifications."
            : "Subscription could not be saved.",
        );
      setSubscription(next);
      setMessage("Push notifications are enabled on this device.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Push notifications could not be enabled.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch("/api/push/subscription", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    setSubscription(null);
    setMessage("Push notifications are disabled on this device.");
    setBusy(false);
  }

  return (
    <section className="push-settings">
      <div>
        <b>Push notifications</b>
        <p>
          {supported
            ? "Receive replies and important SpeakUp announcements."
            : "Push notifications are not supported in this browser."}
        </p>
        {message && <small>{message}</small>}
      </div>
      {supported && (
        <button
          className="outline-button"
          disabled={busy}
          onClick={subscription ? disable : enable}
        >
          {busy ? "Working…" : subscription ? "Disable push" : "Enable push"}
        </button>
      )}
    </section>
  );
}
