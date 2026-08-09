"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "../../components/brand-logo";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter: { display_name: string } | null;
  post: {
    id: string;
    body: string;
    topic: string;
    moderation_status: string;
    author: { id: string; display_name: string; account_status: string } | null;
  } | null;
};

const statuses = ["open", "reviewing", "resolved", "dismissed", "all"];

export function ModerationDashboard({ email }: { email: string }) {
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState({
    title: "",
    message: "",
    url: "/community?view=notices",
  });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/reports?status=${status}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || "Could not load reports");
    else setReports(payload.reports || []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function act(reportId: string, action: string) {
    setWorking(reportId);
    setError("");
    const response = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action, note: notes[reportId] || "" }),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || "Moderation action failed");
    else await loadReports();
    setWorking(null);
  }

  async function sendAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    setSendingAnnouncement(true);
    setAnnouncementResult("");
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(announcement),
    });
    const payload = await response.json();
    setAnnouncementResult(
      response.ok
        ? `Sent in-app to ${payload.recipients} members and pushed to ${payload.pushed} devices.`
        : payload.error || "The announcement could not be sent.",
    );
    if (response.ok) setAnnouncement({ title: "", message: "", url: "/community?view=notices" });
    setSendingAnnouncement(false);
  }

  return (
    <main className="moderation-shell">
      <header className="moderation-header">
        <a href="/">
          <BrandLogo />
        </a>
        <div>
          <span>MODERATION DESK</span>
          <small>{email}</small>
        </div>
        <a className="moderation-exit" href="/community">
          Return to community
        </a>
      </header>
      <section className="moderation-hero">
        <p>TRUTH WITH ACCOUNTABILITY</p>
        <h1>Keep the conversation in the light.</h1>
        <span>
          Review reports carefully, preserve honest disagreement, and act where conduct harms the
          community.
        </span>
      </section>
      <nav className="moderation-tabs" aria-label="Report status">
        {statuses.map((item) => (
          <button
            className={status === item ? "active" : ""}
            onClick={() => setStatus(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      <form className="announcement-composer" onSubmit={sendAnnouncement}>
        <div>
          <p>COMMUNITY BROADCAST</p>
          <h2>Send a notification.</h2>
          <span>
            This creates an in-app notice for every member and a push notification for subscribed
            devices.
          </span>
        </div>
        <label>
          Title
          <input
            required
            maxLength={80}
            value={announcement.title}
            onChange={(event) =>
              setAnnouncement((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="This week in the light"
          />
        </label>
        <label>
          Message
          <textarea
            required
            maxLength={240}
            value={announcement.message}
            onChange={(event) =>
              setAnnouncement((current) => ({ ...current, message: event.target.value }))
            }
            placeholder="Write a clear, timely community update…"
          />
        </label>
        <label>
          Destination
          <input
            required
            value={announcement.url}
            onChange={(event) =>
              setAnnouncement((current) => ({ ...current, url: event.target.value }))
            }
            placeholder="/community?view=notices"
          />
        </label>
        <footer>
          <small>
            {announcement.message.length} / 240 {announcementResult && `· ${announcementResult}`}
          </small>
          <button disabled={sendingAnnouncement}>
            {sendingAnnouncement ? "Sending…" : "Send notification"}
          </button>
        </footer>
      </form>
      {error && <div className="moderation-message error">{error}</div>}
      {loading ? (
        <div className="moderation-message">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="moderation-empty">
          <h2>No reports here.</h2>
          <p>This queue is clear.</p>
        </div>
      ) : (
        <section className="report-list">
          {reports.map((report) => (
            <article className="report-card" key={report.id}>
              <header>
                <div>
                  <span className="report-reason">{report.reason}</span>
                  <b>{report.status}</b>
                </div>
                <time>{new Date(report.created_at).toLocaleString()}</time>
              </header>
              <div className="report-context">
                <p>
                  Reported by <b>{report.reporter?.display_name || "Community member"}</b>
                </p>
                <p>
                  Author <b>{report.post?.author?.display_name || "Unknown"}</b> ·{" "}
                  {report.post?.author?.account_status || "active"}
                </p>
              </div>
              <blockquote>{report.post?.body || "This post is no longer available."}</blockquote>
              {report.details && <p className="report-details">Reporter note: {report.details}</p>}
              <label>
                Moderator note
                <textarea
                  value={notes[report.id] || ""}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [report.id]: event.target.value }))
                  }
                  placeholder="Record the reason for this decision…"
                />
              </label>
              <div className="report-actions">
                <button
                  disabled={working === report.id}
                  onClick={() => act(report.id, "reviewing")}
                >
                  Reviewing
                </button>
                <button
                  disabled={working === report.id}
                  onClick={() => act(report.id, "dismissed")}
                >
                  Dismiss
                </button>
                <button disabled={working === report.id} onClick={() => act(report.id, "hidden")}>
                  Hide post
                </button>
                <button disabled={working === report.id} onClick={() => act(report.id, "removed")}>
                  Remove post
                </button>
                <button disabled={working === report.id} onClick={() => act(report.id, "warned")}>
                  Warn author
                </button>
                <button
                  className="danger"
                  disabled={working === report.id}
                  onClick={() => act(report.id, "suspended")}
                >
                  Suspend author
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
