"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AnonymousIcon,
  ArrowLeft01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  Comment01Icon,
  Copy01Icon,
  Facebook01Icon,
  FavouriteIcon,
  Home01Icon,
  Linkedin01Icon,
  MoreHorizontalIcon,
  NewTwitterIcon,
  Notification01Icon,
  EyeOffIcon,
  Flag01Icon,
  Tick02Icon,
  Search01Icon,
  SentIcon,
  Share08Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import "./community.css";
import { BrandLogo } from "../components/brand-logo";
import { GoogleAuthButton } from "../components/google-auth-button";
import { PushNotificationSettings } from "../components/push-notification-settings";
import { seedPosts, topics } from "./data";
import type { Post } from "./types";
import {
  createRemoteComment,
  createRemotePost,
  loadNotifications,
  loadCommunity,
  markNotificationRead,
  reportRemotePost,
  setRemoteLike,
  setRemoteSaved,
  subscribeToCommunity,
  updateRemoteProfile,
  type CommunityNotice,
} from "./community-api";
const Icon = ({ icon, size = 19 }: { icon: typeof Home01Icon; size?: number }) => (
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.7} aria-hidden="true" />
);

export default function Community() {
  const [view, setView] = useState<"feed" | "explore" | "notices" | "saved" | "profile">("feed");
  const [posts, setPosts] = useState(seedPosts);
  const [filter, setFilter] = useState("For you");
  const [composer, setComposer] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("Reflection");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Guest seeker");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [savedReady, setSavedReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [communityNotices, setCommunityNotices] = useState<CommunityNotice[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("speakup-saved-posts") || "[]");
      setSavedPosts(new Set(Array.isArray(saved) ? saved : []));
    } finally {
      setSavedReady(true);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadCommunity(), loadNotifications()])
      .then(([{ posts: remotePosts, saved, user, hasMore: more }, notices]) => {
        if (remotePosts.length)
          setPosts((current) => [
            ...remotePosts,
            ...current.filter((post) => post.id.startsWith("seed-")),
          ]);
        if (saved.length) setSavedPosts((current) => new Set([...current, ...saved]));
        if (user)
          setDisplayName(user.user_metadata.full_name || user.email?.split("@")[0] || "Member");
        if (notices.length) setCommunityNotices(notices);
        setHasMore(more);
      })
      .catch(() => {
        setBackendError(
          "Live updates are temporarily unavailable. Showing saved community content.",
        );
        notify("Using the offline community feed");
      })
      .finally(() => setLoadingFeed(false));
  }, []);

  useEffect(() => {
    let refreshTimer: number | undefined;
    return subscribeToCommunity(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadCommunity().then(({ posts: remotePosts, hasMore: more }) => {
          setPosts((current) => [
            ...remotePosts,
            ...current.filter((post) => post.id.startsWith("seed-")),
          ]);
          setHasMore(more);
          setPage(0);
        });
      }, 450);
    });
  }, []);

  useEffect(() => {
    if (!savedReady) return;
    window.localStorage.setItem("speakup-saved-posts", JSON.stringify([...savedPosts]));
  }, [savedPosts, savedReady]);

  const visible = useMemo(
    () =>
      posts.filter(
        (p) =>
          (view !== "saved" || savedPosts.has(p.id)) &&
          (filter === "For you" ||
            p.topic === filter ||
            (filter === "Questions" && p.topic === "Question")) &&
          `${p.body} ${p.author} ${p.topic}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [posts, filter, search, savedPosts, view],
  );
  const displayNotices = communityNotices;
  const unreadNoticeCount = displayNotices.filter((item) => !item.isRead).length;

  async function loadMorePosts() {
    const nextPage = page + 1;
    try {
      const { posts: nextPosts, hasMore: more } = await loadCommunity(nextPage);
      setPosts((current) => [
        ...current.filter((post) => !post.id.startsWith("seed-")),
        ...nextPosts.filter((post) => !current.some((existing) => existing.id === post.id)),
        ...seedPosts,
      ]);
      setPage(nextPage);
      setHasMore(more);
    } catch {
      notify("Could not load more thoughts");
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your SpeakUp account and its content? This cannot be undone."))
      return;
    const response = await fetch("/api/account", { method: "DELETE" });
    if (!response.ok) {
      notify("Account deletion could not be completed");
      return;
    }
    window.location.href = "/";
  }

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const name = anonymous ? "Anonymous" : displayName;
    const localId = crypto.randomUUID();
    const newPost: Post = {
      id: localId,
      author: name,
      handle: anonymous ? "Identity protected" : "Guest contributor",
      initials: anonymous
        ? "A"
        : name
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
      anonymous,
      time: "now",
      topic,
      body: body.trim(),
      likes: 0,
      ownedByMe: true,
      comments: [],
    };
    setPosts([newPost, ...posts]);
    setBody("");
    setComposer(false);
    try {
      const remoteId = await createRemotePost({ topic, body: newPost.body, anonymous });
      if (remoteId) {
        setPosts((current) =>
          current.map((post) => (post.id === localId ? { ...post, id: remoteId } : post)),
        );
        notify("Thought published");
      } else notify("Saved on this device — sign in to publish across devices");
    } catch {
      notify("Saved locally; the community database could not be reached");
    }
  }
  async function like(id: string) {
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    const nextLiked = !post.liked;
    setPosts((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, liked: nextLiked, likes: item.likes + (nextLiked ? 1 : -1) }
          : item,
      ),
    );
    try {
      const synced = await setRemoteLike(id, nextLiked);
      if (!synced && !id.startsWith("seed-")) {
        setPosts((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  liked: post.liked,
                  likes: post.likes,
                }
              : item,
          ),
        );
        notify("Sign in to like community posts");
      }
    } catch {
      setPosts((current) =>
        current.map((item) =>
          item.id === id ? { ...item, liked: post.liked, likes: post.likes } : item,
        ),
      );
      notify("The like could not be saved. Please try again.");
    }
  }
  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }
  function toggleSaved(id: string) {
    const willSave = !savedPosts.has(id);
    setSavedPosts((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        notify("Removed from saved posts");
      } else {
        next.add(id);
        notify("Post saved");
      }
      return next;
    });
    setOpenMenu(null);
    setRemoteSaved(id, willSave).catch(() => notify("Saved on this device only"));
  }
  function hidePost(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id));
    setOpenMenu(null);
    notify("Post hidden from your feed");
  }
  function copyFromMenu(post: Post) {
    navigator.clipboard.writeText(
      `“${post.body}” — ${post.author} on SpeakUp\n${window.location.href}`,
    );
    setOpenMenu(null);
    notify("Post text copied");
  }
  async function addComment(id: string) {
    if (!comment.trim()) return;
    const text = comment.trim();
    const localId = crypto.randomUUID();
    setPosts(
      posts.map((p) =>
        p.id === id
          ? {
              ...p,
              comments: [...p.comments, { id: localId, author: displayName, body: text }],
            }
          : p,
      ),
    );
    setComment("");
    try {
      const remoteId = await createRemoteComment(id, text);
      if (remoteId)
        setPosts((current) =>
          current.map((post) =>
            post.id === id
              ? {
                  ...post,
                  comments: post.comments.map((item) =>
                    item.id === localId ? { ...item, id: remoteId } : item,
                  ),
                }
              : post,
          ),
        );
      else if (!id.startsWith("seed-")) {
        setPosts((current) =>
          current.map((post) =>
            post.id === id
              ? { ...post, comments: post.comments.filter((item) => item.id !== localId) }
              : post,
          ),
        );
        notify("Sign in to comment on community posts");
      }
    } catch {
      setPosts((current) =>
        current.map((post) =>
          post.id === id
            ? { ...post, comments: post.comments.filter((item) => item.id !== localId) }
            : post,
        ),
      );
      notify("The comment could not be saved. Please try again.");
    }
  }
  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(" "),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  async function createShareCard(post: Post) {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    const styles = getComputedStyle(document.documentElement);
    const flexing = styles.getPropertyValue("--font-flexing").trim() || "serif";
    const sans = styles.getPropertyValue("--font-google-sans-flex").trim() || "Arial";
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
    const variant =
      [...post.id].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
    const palette = [
      { bg: "#ffffff", fg: "#0b0b0b" },
      { bg: "#dedbd2", fg: "#0b0b0b" },
      { bg: "#494949", fg: "#ffffff" },
      { bg: "#0b0b0b", fg: "#ffffff" },
    ];
    const photo = variant === 1;
    let light = photo ? "#ffffff" : palette[variant === 0 ? 3 : variant - 2]?.fg || "#0b0b0b";
    if (photo) {
      const hero = await loadImage("/assets/brand/carry-the-light.png");
      const scale = Math.max(1080 / hero.width, 1080 / hero.height);
      const width = hero.width * scale,
        height = hero.height * scale;
      ctx.drawImage(hero, (1080 - width) / 2, (1080 - height) / 2, width, height);
      const shade = ctx.createLinearGradient(0, 0, 0, 1080);
      shade.addColorStop(0, "rgba(0,0,0,.28)");
      shade.addColorStop(0.55, "rgba(0,0,0,.5)");
      shade.addColorStop(1, "rgba(0,0,0,.88)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 1080, 1080);
    } else {
      const theme = variant === 0 ? palette[3] : palette[variant - 2] || palette[0];
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, 1080, 1080);
      light = theme.fg;
      ctx.strokeStyle = light === "#ffffff" ? "rgba(255,255,255,.16)" : "rgba(11,11,11,.13)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(870, 185, 235, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(870, 185, 165, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = light;
    ctx.font = `700 24px ${sans}`;
    ctx.fillText(`0${Math.min(9, variant + 1)}  /  ${post.topic.toUpperCase()}`, 74, 90);
    const content = post.quote || post.body;
    ctx.font = `400 ${content.length > 180 ? 54 : 66}px ${flexing}`;
    const lines = wrapText(ctx, `“${content}”`, 900).slice(0, content.length > 180 ? 8 : 7);
    lines.forEach((line, i) => ctx.fillText(line, 74, 205 + i * (content.length > 180 ? 63 : 76)));
    const showSubtext =
      Boolean(post.quote) &&
      content.length < 150 &&
      post.body.length < 250 &&
      post.topic.length < 24;
    if (showSubtext) {
      ctx.font = `400 25px ${sans}`;
      ctx.globalAlpha = 0.72;
      const supporting = wrapText(ctx, post.body, 820).slice(0, 3);
      supporting.forEach((line, i) => ctx.fillText(line, 74, 720 + i * 35));
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = light;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(74, 880);
    ctx.lineTo(1006, 880);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `700 25px ${sans}`;
    ctx.fillText(post.anonymous ? "ANONYMOUS" : post.author.toUpperCase(), 74, 933);
    ctx.font = `400 20px ${sans}`;
    ctx.globalAlpha = 0.65;
    ctx.fillText("TRUTH, UNSCRIPTED.", 74, 970);
    ctx.globalAlpha = 1;
    ctx.font = `700 38px ${flexing}`;
    ctx.fillText("Speak", 790, 928);
    ctx.font = `700 45px ${flexing}`;
    ctx.fillText("Up", 790, 964);
    const mark = await loadImage("/assets/brand/hand-lantern-mark.png");
    const markHeight = 84;
    const markWidth = markHeight * (mark.naturalWidth / mark.naturalHeight);
    ctx.save();
    ctx.globalAlpha = 0.92;
    if (light === "#ffffff") ctx.filter = "invert(1)";
    ctx.shadowColor = light === "#ffffff" ? "rgba(255,255,255,.12)" : "rgba(11,11,11,.12)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.translate(948, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(mark, 0, 888, markWidth, markHeight);
    ctx.restore();
    return new Promise<{ url: string; blob: Blob }>((resolve) =>
      canvas.toBlob(
        (blob) => resolve({ url: URL.createObjectURL(blob!), blob: blob! }),
        "image/png",
      ),
    );
  }
  async function nativeShare(post: Post) {
    setSharePost(post);
    const card = await createShareCard(post);
    setShareCardUrl(card.url);
  }
  async function shareViaDevice(post: Post) {
    const card = await createShareCard(post);
    const file = new File([card.blob], `speakup-${post.id}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] }))
      await navigator.share({ title: "A thought from SpeakUp", text: post.body, files: [file] });
  }
  function copyPost(post: Post) {
    navigator.clipboard.writeText(
      `“${post.body}” — ${post.author} on SpeakUp\n${window.location.href}`,
    );
    setSharePost(null);
  }

  return (
    <main className="community-app">
      <aside className="community-sidebar">
        <a href="/" aria-label="Back to SpeakUp home">
          <BrandLogo />
        </a>
        <nav aria-label="Community navigation">
          <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>
            <Icon icon={Home01Icon} /> <span>Home</span>
          </button>
          <button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}>
            <Icon icon={Search01Icon} /> <span>Explore</span>
          </button>
          <button className={view === "notices" ? "active" : ""} onClick={() => setView("notices")}>
            <Icon icon={Notification01Icon} /> <span>Notices</span>
            {unreadNoticeCount > 0 && <i>{unreadNoticeCount}</i>}
          </button>
          <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>
            <Icon icon={Bookmark02Icon} /> <span>Saved</span>
          </button>
          <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>
            <Icon icon={UserCircleIcon} /> <span>Identity</span>
          </button>
        </nav>
        <button className="community-primary" onClick={() => setComposer(true)}>
          <Icon icon={Add01Icon} /> <span>Bring it to light</span>
        </button>
        <button className="identity-chip" onClick={() => setView("profile")}>
          <span>
            {displayName
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </span>
          <p>
            <b>{displayName}</b>
            <small>Posting is open</small>
          </p>
          <Icon icon={MoreHorizontalIcon} />
        </button>
      </aside>

      <section className="community-main" id="feed">
        <header className="community-topbar">
          <a className="community-mobile-logo" href="/" aria-label="SpeakUp home">
            <BrandLogo compact />
          </a>
          <div>
            <p className="section-label">
              {view === "profile"
                ? "YOUR IDENTITY"
                : view === "saved"
                  ? "YOUR LIBRARY"
                  : view === "explore"
                    ? "DISCOVER"
                    : view === "notices"
                      ? "YOUR UPDATES"
                      : "THE COMMUNITY"}
            </p>
            <h1>
              {view === "profile"
                ? "Your profile."
                : view === "saved"
                  ? "Saved light."
                  : view === "explore"
                    ? "Explore truth."
                    : view === "notices"
                      ? "Notices."
                      : "In the light."}
            </h1>
          </div>
          <button className="mobile-compose" onClick={() => setComposer(true)}>
            <Icon icon={Add01Icon} />
          </button>
        </header>
        {view !== "profile" && view !== "notices" && (
          <div className="topic-tabs" role="tablist" aria-label="Filter conversations">
            {topics.map((t) => (
              <button
                role="tab"
                aria-selected={filter === t}
                className={filter === t ? "active" : ""}
                onClick={() => setFilter(t)}
                key={t}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {view === "feed" && (
          <button className="composer-prompt" onClick={() => setComposer(true)}>
            <span>{displayName[0]}</span>
            <p>What truth are you bringing to light?</p>
            <Icon icon={Add01Icon} />
          </button>
        )}
        {view !== "profile" && view !== "notices" && (
          <div className="mobile-search community-search">
            <Icon icon={Search01Icon} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
          </div>
        )}

        {view === "profile" && (
          <section className="profile-view">
            <div className="profile-view__identity">
              <span className="profile-view__avatar">
                {displayName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <p className="section-label">COMMUNITY MEMBER</p>
                <h2>{displayName}</h2>
                <p>Your public name can be changed without changing your private account.</p>
              </div>
            </div>
            <div className="profile-view__stats">
              <article>
                <b>
                  {posts.filter((post) => !post.anonymous && post.author === displayName).length}
                </b>
                <span>Thoughts</span>
              </article>
              <article>
                <b>{savedPosts.size}</b>
                <span>Saved</span>
              </article>
              <article>
                <b>{posts.filter((post) => post.liked).length}</b>
                <span>Liked</span>
              </article>
            </div>
            <div className="profile-view__actions">
              <button className="community-primary" onClick={() => setIdentityOpen(true)}>
                Edit public identity
              </button>
              <GoogleAuthButton />
              <button className="danger-button" onClick={deleteAccount}>
                Delete account
              </button>
            </div>
            <p className="profile-view__privacy">
              Anonymous posts never display this profile name. Your account remains privately
              attached for safety and moderation.
            </p>
            <PushNotificationSettings />
          </section>
        )}

        {view === "explore" && (
          <section className="explore-intro">
            <p className="section-label">SEARCH THE CONVERSATION</p>
            <h2>Find the questions others are carrying.</h2>
            <p>Search by phrase, author, or topic, then narrow the results with the topic bar.</p>
          </section>
        )}

        {view === "notices" && (
          <section className="notices-view">
            <header>
              <p>Updates from conversations and the SpeakUp community.</p>
              <button
                onClick={() => {
                  setCommunityNotices((current) =>
                    current.map((item) => ({ ...item, isRead: true })),
                  );
                  markNotificationRead().catch(() => notify("Could not update notices"));
                }}
              >
                Mark all as read
              </button>
            </header>
            {displayNotices.map((item) => (
              <button
                className={`notice-item ${item.isRead ? "read" : ""}`}
                key={item.id}
                onClick={() => {
                  setCommunityNotices((current) =>
                    current.map((noticeItem) =>
                      noticeItem.id === item.id ? { ...noticeItem, isRead: true } : noticeItem,
                    ),
                  );
                  markNotificationRead(item.id).catch(() => notify("Could not update notice"));
                }}
              >
                <span>
                  <Icon icon={item.kind === "community" ? Notification01Icon : Comment01Icon} />
                </span>
                <p>
                  <b>
                    {item.kind === "comment"
                      ? "A new voice joined the conversation"
                      : item.kind === "like"
                        ? "Your thought was carried forward"
                        : "Community note"}
                  </b>
                  <small>{item.message}</small>
                </p>
                <time>{item.time}</time>
              </button>
            ))}
            {!displayNotices.length && (
              <div className="notices-empty">
                <h2>No notices yet.</h2>
                <p>Replies, likes, and community updates will appear here.</p>
              </div>
            )}
          </section>
        )}

        {view !== "profile" && view !== "notices" && (
          <AnimatePresence mode="popLayout">
            {visible.map((post, index) => (
              <motion.article
                layout
                className="community-post"
                key={post.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <div className={`community-avatar ${post.anonymous ? "anonymous" : ""}`}>
                  {post.anonymous ? <Icon icon={AnonymousIcon} /> : post.initials}
                </div>
                <div className="community-post__content">
                  <div className="community-post__head">
                    <p>
                      <b>{post.author}</b>
                      <span>
                        {post.handle} · {post.time}
                      </span>
                    </p>
                    <span className="post-topic">{post.topic}</span>
                    <div className="post-menu-wrap">
                      <button
                        className="post-menu-trigger"
                        onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                        aria-label="Post options"
                        aria-expanded={openMenu === post.id}
                      >
                        <Icon icon={MoreHorizontalIcon} />
                      </button>
                      <AnimatePresence>
                        {openMenu === post.id && (
                          <motion.div
                            className="post-menu"
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          >
                            <button onClick={() => nativeShare(post)}>
                              <Icon icon={Share08Icon} />
                              Share branded card
                            </button>
                            <button onClick={() => copyFromMenu(post)}>
                              <Icon icon={Copy01Icon} />
                              Copy post text
                            </button>
                            <button onClick={() => toggleSaved(post.id)}>
                              <Icon icon={savedPosts.has(post.id) ? Tick02Icon : Bookmark02Icon} />
                              {savedPosts.has(post.id) ? "Saved" : "Save for later"}
                            </button>
                            {!post.ownedByMe && (
                              <>
                                <button onClick={() => hidePost(post.id)}>
                                  <Icon icon={EyeOffIcon} />
                                  Hide from my feed
                                </button>
                                <button
                                  className="report"
                                  onClick={async () => {
                                    setOpenMenu(null);
                                    try {
                                      const sent = await reportRemotePost(post.id);
                                      notify(
                                        sent
                                          ? "Report received for review"
                                          : "Sign in to submit reports",
                                      );
                                    } catch {
                                      notify("This post has already been reported");
                                    }
                                  }}
                                >
                                  <Icon icon={Flag01Icon} />
                                  Report post
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {post.quote && <blockquote>“{post.quote}”</blockquote>}
                  <p className="community-post__body">{post.body}</p>
                  <div className="community-actions">
                    <button
                      className={post.liked ? "liked" : ""}
                      onClick={() => like(post.id)}
                      aria-label={post.liked ? "Unlike" : "Like"}
                    >
                      <Icon icon={FavouriteIcon} />
                      {post.likes}
                    </button>
                    <button
                      onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                    >
                      <Icon icon={Comment01Icon} />
                      {post.comments.length}
                    </button>
                    <button onClick={() => nativeShare(post)}>
                      <Icon icon={Share08Icon} />
                      Share card
                    </button>
                    <button
                      className={`save ${savedPosts.has(post.id) ? "saved" : ""}`}
                      onClick={() => toggleSaved(post.id)}
                      aria-label={savedPosts.has(post.id) ? "Unsave post" : "Save post"}
                    >
                      <Icon icon={savedPosts.has(post.id) ? Tick02Icon : Bookmark02Icon} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {openComments === post.id && (
                      <motion.div
                        className="comments"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {post.comments.map((c) => (
                          <div className="comment" key={c.id}>
                            <span>{c.author[0]}</span>
                            <p>
                              <b>{c.author}</b>
                              {c.body}
                            </p>
                          </div>
                        ))}
                        <div className="comment-box">
                          <input
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addComment(post.id)}
                            placeholder="Add to the conversation…"
                            aria-label="Write a comment"
                          />
                          <button onClick={() => addComment(post.id)} aria-label="Send comment">
                            <Icon icon={SentIcon} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
        {view !== "profile" && view !== "notices" && !visible.length && (
          <div className="empty-feed">
            <h2>{view === "saved" ? "Nothing saved yet." : "Nothing hidden here."}</h2>
            <p>
              {view === "saved"
                ? "Use the bookmark on a post to keep it here."
                : "Try another search or begin the conversation yourself."}
            </p>
          </div>
        )}
        {loadingFeed && view !== "profile" && view !== "notices" && (
          <div className="community-status">Bringing the latest thoughts to light…</div>
        )}
        {backendError && (
          <div className="community-status community-status--error">{backendError}</div>
        )}
        {hasMore && view === "feed" && !loadingFeed && (
          <button className="load-more" onClick={loadMorePosts}>
            Load more thoughts
          </button>
        )}
      </section>

      <aside className="community-right">
        <div className="community-search">
          <Icon icon={Search01Icon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
        </div>
        <div className="side-card dark">
          <p className="section-label">COMMUNITY NOTE</p>
          <h2>
            Truth with
            <br />
            grace.
          </h2>
          <p>Challenge ideas honestly. Treat people with dignity. Add light, not heat.</p>
          <a href="/">
            Read our values <span>↗</span>
          </a>
        </div>
        <div className="side-card">
          <p className="section-label">TRENDING IN THE LIGHT</p>
          {[
            "Faith at work",
            "Beyond church walls",
            "Asking better questions",
            "Scripture & culture",
          ].map((x, i) => (
            <button onClick={() => setSearch(x.split(" ")[0])} key={x}>
              <span>0{i + 1}</span>
              <p>
                <b>{x}</b>
                <small>{[128, 96, 74, 51][i]} thoughts</small>
              </p>
            </button>
          ))}
        </div>
        <p className="community-foot">© 2026 SPEAKUP · TRUTH, UNSCRIPTED.</p>
      </aside>

      <AnimatePresence>
        {composer && (
          <div className="modal-wrap" role="presentation" onMouseDown={() => setComposer(false)}>
            <motion.form
              className="compose-modal"
              onSubmit={publish}
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
            >
              <header>
                <div>
                  <p className="section-label">NEW THOUGHT</p>
                  <h2>Bring it to light.</h2>
                  <p className="compose-intro">
                    Share what you&apos;re learning, questioning, or seeing more clearly.
                  </p>
                </div>
                <button
                  className="compose-close"
                  type="button"
                  onClick={() => setComposer(false)}
                  aria-label="Close"
                >
                  <Icon icon={Cancel01Icon} />
                </button>
              </header>
              <div className="compose-author">
                <span>
                  {anonymous ? (
                    <Icon icon={AnonymousIcon} />
                  ) : (
                    displayName
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)
                  )}
                </span>
                <p>
                  <b>{anonymous ? "Anonymous" : displayName}</b>
                  <small>
                    {anonymous
                      ? "Your identity will be protected"
                      : "Posting to the SpeakUp community"}
                  </small>
                </p>
              </div>
              <textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1200}
                placeholder="What truth are you bringing to light?"
                aria-label="Post content"
              />
              <div className="compose-options">
                <div className="compose-topics">
                  <p>CHOOSE A SPACE</p>
                  <div>
                    {["Reflection", "Scripture", "Question", "Culture", "Beyond the walls"].map(
                      (item) => (
                        <button
                          type="button"
                          className={topic === item ? "active" : ""}
                          onClick={() => setTopic(item)}
                          key={item}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <label className="anonymous-toggle">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  <span>
                    <Icon icon={AnonymousIcon} />
                  </span>
                  <p>
                    <b>Post anonymously</b>
                    <small>Hide your name on this thought</small>
                  </p>
                </label>
              </div>
              <footer>
                <small>
                  <b>{body.length}</b> / 1200 characters
                </small>
                <button className="community-primary" disabled={!body.trim()} type="submit">
                  Publish thought <Icon icon={SentIcon} />
                </button>
              </footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {identityOpen && (
          <div className="modal-wrap" onMouseDown={() => setIdentityOpen(false)}>
            <motion.div
              className="identity-modal"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <button className="modal-close" onClick={() => setIdentityOpen(false)}>
                <Icon icon={Cancel01Icon} />
              </button>
              <p className="section-label">YOUR IDENTITY</p>
              <h2>Come as you are.</h2>
              <p>
                You can participate without an account, use a simple display name, or protect your
                identity on individual posts.
              </p>
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
              </label>
              <button
                className="community-primary"
                onClick={async () => {
                  const nextDisplayName = displayName.trim() || "Guest seeker";
                  setDisplayName(nextDisplayName);
                  setIdentityOpen(false);
                  try {
                    const synced = await updateRemoteProfile(nextDisplayName);
                    notify(synced ? "Profile updated" : "Display name saved on this device");
                  } catch {
                    notify("Display name saved locally");
                  }
                }}
              >
                Continue without registering
              </button>
              <div className="divider">
                <span>or</span>
              </div>
              <GoogleAuthButton />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sharePost && (
          <div
            className="modal-wrap"
            onMouseDown={() => {
              setSharePost(null);
              setShareCardUrl(null);
            }}
          >
            <motion.div
              className="share-modal share-modal--card"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <button
                className="modal-close"
                onClick={() => {
                  setSharePost(null);
                  setShareCardUrl(null);
                }}
              >
                <Icon icon={Cancel01Icon} />
              </button>
              <p className="section-label">SHARE THE LIGHT</p>
              <h2>Carry it further.</h2>
              {shareCardUrl && (
                <img
                  className="share-preview"
                  src={shareCardUrl}
                  alt="Branded preview of this SpeakUp post"
                />
              )}
              <div className="share-grid">
                <a download={`speakup-${sharePost.id}.png`} href={shareCardUrl || "#"}>
                  <Icon icon={Share08Icon} />
                  Download card
                </a>
                <a
                  target="_blank"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePost.body)}&url=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`}
                >
                  <Icon icon={NewTwitterIcon} />X
                </a>
                <a
                  target="_blank"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`}
                >
                  <Icon icon={Facebook01Icon} />
                  Facebook
                </a>
                <a
                  target="_blank"
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`}
                >
                  <Icon icon={Linkedin01Icon} />
                  LinkedIn
                </a>
                <button onClick={() => copyPost(sharePost)}>
                  <Icon icon={Copy01Icon} />
                  Copy text
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notice && (
          <motion.div
            className="community-toast"
            role="status"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Icon icon={Tick02Icon} />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
