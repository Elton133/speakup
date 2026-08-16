"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Delete02Icon,
  Edit02Icon,
  Facebook01Icon,
  FavouriteIcon,
  Home01Icon,
  Linkedin01Icon,
  MoreHorizontalIcon,
  NewTwitterIcon,
  Notification01Icon,
  EyeOffIcon,
  FileAudioIcon,
  Flag01Icon,
  Tick02Icon,
  Search01Icon,
  SentIcon,
  Share08Icon,
  UserCircleIcon,
  Video01Icon,
  AudioWaveformIcon,
} from "@hugeicons/core-free-icons";
import "./community.css";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { BrandLogo } from "../components/brand-logo";
import { GoogleAuthButton } from "../components/google-auth-button";
import { PushNotificationSettings } from "../components/push-notification-settings";
import { seedPosts, topics } from "./data";
import type { Comment, Post } from "./types";
import {
  attachRemoteMedia,
  createRemoteComment,
  createRemotePost,
  deleteRemotePost,
  loadNotifications,
  loadCommunity,
  loadProfileStats,
  loadTrendingTopics,
  markNotificationRead,
  relativeTime,
  reportRemotePost,
  setRemoteCommentLike,
  setRemoteLike,
  setRemoteSaved,
  subscribeToCommunity,
  subscribeToNotifications,
  updateRemotePost,
  updateRemoteProfile,
  uploadCommunityMedia,
  type CommunityNotice,
} from "./community-api";
const Icon = ({ icon, size = 19 }: { icon: typeof Home01Icon; size?: number }) => (
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.7} aria-hidden="true" />
);

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Moves focus into a dialog while it is open, keeps Tab inside it, and returns
 * focus to whatever opened it on close.
 */
function useDialog<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const container = ref.current;
    const preferred =
      container?.querySelector<HTMLElement>("[data-autofocus]") ??
      container?.querySelector<HTMLElement>(FOCUSABLE);
    (preferred ?? container)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (item) => item.offsetParent !== null,
      );
      if (!items.length) return;
      const edge = event.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [open]);

  return ref;
}

export default function Community() {
  const [view, setView] = useState<"feed" | "explore" | "notices" | "saved" | "profile">("feed");
  // Seed posts are demo content: they stand in only when there is no backend to read.
  const [posts, setPosts] = useState<Post[]>(isSupabaseConfigured ? [] : seedPosts);
  const [filter, setFilter] = useState("For you");
  const [composer, setComposer] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [anonymousAccount, setAnonymousAccount] = useState(false);
  const [mainText, setMainText] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("Reflection");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, Comment | null>>({});
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [shareCards, setShareCards] = useState<Array<{ url: string; blob: Blob }>>([]);
  const [shareCardIndex, setShareCardIndex] = useState(0);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Guest seeker");
  const [search, setSearch] = useState("");
  const [searchState, setSearchState] = useState<{ term: string; posts: Post[] } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());
  const [savedReady, setSavedReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [communityNotices, setCommunityNotices] = useState<CommunityNotice[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileStats, setProfileStats] = useState<{
    thoughts: number;
    saved: number;
    liked: number;
  } | null>(null);
  const [trending, setTrending] = useState<Array<{ topic: string; count: number }>>([]);
  const noticeTimer = useRef<number | undefined>(undefined);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const router = useRouter();
  const composerRef = useDialog<HTMLFormElement>(composer);
  const identityRef = useDialog<HTMLDivElement>(identityOpen);
  const shareRef = useDialog<HTMLDivElement>(Boolean(sharePost));
  // Read a browser-only capability without desyncing from the server render.
  const canNativeShare = useSyncExternalStore(
    () => () => undefined,
    () => Boolean(navigator.share),
    () => false,
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("speakup-saved-posts") || "[]");
      setSavedPosts(new Set(Array.isArray(saved) ? saved : []));
      const hidden = JSON.parse(window.localStorage.getItem("speakup-hidden-posts") || "[]");
      setHiddenPosts(new Set(Array.isArray(hidden) ? hidden : []));
      const savedDisplayName = window.localStorage.getItem("speakup-display-name");
      if (savedDisplayName) setDisplayName(savedDisplayName);
    } finally {
      setSavedReady(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "error") return;
    const reason = params.get("reason") || "Google authentication could not be completed.";
    setBackendError(`Google sign-in failed: ${reason}`);
    notify("Google sign-in could not be completed");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    Promise.all([loadCommunity(), loadNotifications()])
      .then(
        ([
          { posts: remotePosts, saved, user, displayName: profileName, hasMore: more },
          notices,
        ]) => {
          if (remotePosts.length) setPosts(remotePosts);
          if (saved.length) setSavedPosts((current) => new Set([...current, ...saved]));
          if (user) {
            const isAnonymousUser = Boolean(user.is_anonymous);
            setUserId(user.id);
            setAnonymousAccount(isAnonymousUser);
            setAnonymous(isAnonymousUser);
            setDisplayName(
              profileName ||
                user.user_metadata.full_name ||
                user.email?.split("@")[0] ||
                "Guest seeker",
            );
          }
          if (notices.length) setCommunityNotices(notices);
          setHasMore(more);
        },
      )
      .catch(() => {
        setPosts(seedPosts);
        setBackendError(
          "Live updates are temporarily unavailable. Showing saved community content.",
        );
        notify("Using the offline community feed");
      })
      .finally(() => setLoadingFeed(false));

    loadTrendingTopics()
      .then(setTrending)
      .catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    let refreshTimer: number | undefined;
    const unsubscribe = subscribeToCommunity(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        // Merge rather than replace, so posts pulled in by "Load more" and any
        // post still awaiting its first sync survive a live refresh.
        loadCommunity().then(({ posts: remotePosts, hasMore: more }) => {
          setPosts((current) => {
            const refreshed = new Set(remotePosts.map((post) => post.id));
            return [...remotePosts, ...current.filter((post) => !refreshed.has(post.id))];
          });
          if (page === 0) setHasMore(more);
        });
      }, 450);
    });
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [page]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToNotifications(userId, () => {
      loadNotifications()
        .then(setCommunityNotices)
        .catch(() => undefined);
    });
  }, [userId]);

  useEffect(() => {
    if (view !== "profile" || !userId) return;
    loadProfileStats()
      .then(setProfileStats)
      .catch(() => setProfileStats(null));
  }, [view, userId]);

  // Search the whole community, not just the page already in memory.
  useEffect(() => {
    const term = search.trim();
    if (!term || !isSupabaseConfigured) return;
    let active = true;
    const timer = window.setTimeout(() => {
      loadCommunity(0, 30, { search: term })
        .then(({ posts: found }) => {
          if (active) setSearchState({ term, posts: found });
        })
        .catch(() => {
          if (active) setSearchState({ term, posts: [] });
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!savedReady) return;
    window.localStorage.setItem("speakup-saved-posts", JSON.stringify([...savedPosts]));
  }, [savedPosts, savedReady]);

  useEffect(() => {
    if (!savedReady) return;
    window.localStorage.setItem("speakup-hidden-posts", JSON.stringify([...hiddenPosts]));
  }, [hiddenPosts, savedReady]);

  // Escape closes the topmost layer; a click outside a post menu dismisses it.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (sharePost) closeShare();
      else if (identityOpen) setIdentityOpen(false);
      else if (composer) closeComposer();
      else if (openMenu) setOpenMenu(null);
    }
    function onPointerDown(event: MouseEvent) {
      if (!openMenu) return;
      if (!(event.target as HTMLElement).closest(".post-menu-wrap")) setOpenMenu(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  });

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const searchTerm = search.trim().toLowerCase();
  const remoteTerm = isSupabaseConfigured ? search.trim() : "";
  // Remote results are authoritative once they arrive; until then the loaded
  // page is still filtered locally so the feed never goes blank mid-keystroke.
  const searchResults = remoteTerm && searchState?.term === remoteTerm ? searchState.posts : null;
  const searching = Boolean(remoteTerm) && !searchResults;
  const visible = useMemo(() => {
    const source = searchResults
      ? [
          ...searchResults,
          // Seed posts only exist offline, and are never returned by the query.
          ...posts.filter(
            (post) =>
              post.id.startsWith("seed-") &&
              `${post.quote || ""} ${post.body} ${post.author} ${post.topic}`
                .toLowerCase()
                .includes(searchTerm),
          ),
        ]
      : posts;
    return source.filter(
      (p) =>
        !hiddenPosts.has(p.id) &&
        (view !== "saved" || savedPosts.has(p.id)) &&
        (filter === "For you" ||
          p.topic === filter ||
          (filter === "Questions" && p.topic === "Question")) &&
        (Boolean(searchResults) ||
          `${p.quote || ""} ${p.body} ${p.author} ${p.topic}`.toLowerCase().includes(searchTerm)),
    );
  }, [posts, searchResults, searchTerm, filter, savedPosts, hiddenPosts, view]);
  const displayNotices = communityNotices;
  const unreadNoticeCount = displayNotices.filter((item) => !item.isRead).length;

  async function loadMorePosts() {
    const nextPage = page + 1;
    try {
      const { posts: nextPosts, hasMore: more } = await loadCommunity(nextPage);
      setPosts((current) => [
        ...current,
        ...nextPosts.filter((post) => !current.some((existing) => existing.id === post.id)),
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

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview("");
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }

  function chooseMedia(file?: File) {
    if (!file) return;
    const kind = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : null;
    const limit = kind === "video" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
    if (!kind) return notify("Choose a video or audio file");
    if (file.size > limit)
      return notify(
        `${kind === "video" ? "Videos" : "Audio files"} must be under ${kind === "video" ? "100 MB" : "25 MB"}`,
      );
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      notify("Audio recording is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type });
        chooseMedia(new File([blob], `speakup-recording-${Date.now()}.webm`, { type }));
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch {
      notify("Microphone access was not granted");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function publish(e: FormEvent) {
    e.preventDefault();
    const featured = mainText.trim();
    const supporting = body.trim();
    if (!featured && !supporting) return;
    const postBody = supporting || featured;
    const postQuote = featured && supporting ? featured : undefined;
    // Anonymous accounts are forced anonymous by the database, so never preview
    // a name the post will not carry.
    const postAnonymously = anonymousAccount || anonymous;

    if (editingPostId) {
      try {
        const updated = await updateRemotePost(editingPostId, {
          topic,
          body: postBody,
          quote: postQuote,
          anonymous: postAnonymously,
        });
        if (!updated) {
          notify("This post could not be updated");
          return;
        }
        setPosts((current) =>
          current.map((post) =>
            post.id === editingPostId
              ? {
                  ...post,
                  topic,
                  body: postBody,
                  quote: postQuote,
                  anonymous: updated.anonymous,
                  author: updated.anonymous ? "Anonymous" : displayName,
                  handle: updated.anonymous ? "Identity protected" : post.handle,
                  initials: updated.anonymous
                    ? "A"
                    : displayName
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase(),
                }
              : post,
          ),
        );
        setEditingPostId(null);
        setMainText("");
        setBody("");
        setComposer(false);
        notify("Post updated");
      } catch {
        notify("The post could not be updated. Please try again.");
      }
      return;
    }
    const name = postAnonymously ? "Anonymous" : displayName;
    const localId = crypto.randomUUID();
    const newPost: Post = {
      id: localId,
      author: name,
      handle: postAnonymously ? "Identity protected" : "Guest contributor",
      initials: postAnonymously
        ? "A"
        : name
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
      anonymous: postAnonymously,
      time: "now",
      topic,
      body: postBody,
      quote: postQuote,
      likes: 0,
      ownedByMe: true,
      comments: [],
      media: mediaFile
        ? [
            {
              id: `local-${localId}`,
              kind: mediaFile.type.startsWith("video/") ? "video" : "audio",
              url: mediaPreview,
              mimeType: mediaFile.type,
              size: mediaFile.size,
            },
          ]
        : [],
    };
    setPosts([newPost, ...posts]);
    setMainText("");
    setBody("");
    setComposer(false);
    try {
      const remotePost = await createRemotePost({
        topic,
        body: newPost.body,
        quote: newPost.quote,
        anonymous: postAnonymously,
      });
      if (remotePost) {
        setPosts((current) =>
          current.map((post) =>
            post.id === localId
              ? {
                  ...post,
                  id: remotePost.id,
                  anonymous: remotePost.anonymous,
                  author: remotePost.anonymous ? "Anonymous" : post.author,
                  handle: remotePost.anonymous ? "Identity protected" : post.handle,
                  initials: remotePost.anonymous ? "A" : post.initials,
                }
              : post,
          ),
        );
        if (mediaFile) {
          setMediaUploading(true);
          try {
            const prepared = await uploadCommunityMedia(mediaFile);
            const attached = await attachRemoteMedia(remotePost.id, prepared);
            setPosts((current) =>
              current.map((post) =>
                post.id === remotePost.id ? { ...post, media: [attached] } : post,
              ),
            );
            clearMedia();
            notify("Thought and media published");
          } catch (error) {
            setPosts((current) =>
              current.map((post) => (post.id === remotePost.id ? { ...post, media: [] } : post)),
            );
            notify(
              error instanceof Error
                ? error.message
                : "The thought published, but its media did not upload",
            );
          } finally {
            setMediaUploading(false);
          }
        } else notify("Thought published");
      } else notify("Saved on this device — sign in to publish across devices");
    } catch {
      notify("Saved locally; the community database could not be reached");
    }
  }
  function beginPost() {
    setEditingPostId(null);
    setMainText("");
    setBody("");
    setTopic("Reflection");
    clearMedia();
    setComposer(true);
  }
  function editPost(post: Post) {
    setEditingPostId(post.id);
    setMainText(post.quote || post.body);
    setBody(post.quote ? post.body : "");
    setTopic(post.topic);
    setAnonymous(Boolean(post.anonymous));
    setOpenMenu(null);
    setComposer(true);
  }
  function closeComposer() {
    setComposer(false);
    setEditingPostId(null);
    setMainText("");
    setBody("");
    if (recording) stopRecording();
    clearMedia();
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
    window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2400);
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
    setHiddenPosts((current) => new Set(current).add(id));
    setOpenMenu(null);
    notify("Post hidden from your feed");
  }
  function getPostUrl(post: Post) {
    const path = post.id.startsWith("seed-") ? "/community" : `/community/post/${post.id}`;
    return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  }
  async function deletePost(id: string) {
    if (!window.confirm("Delete this post and all its comments? This cannot be undone.")) return;
    setOpenMenu(null);
    try {
      const deleted = await deleteRemotePost(id);
      if (!deleted) {
        notify("This post could not be deleted");
        return;
      }
      setPosts((current) => current.filter((post) => post.id !== id));
      setSavedPosts((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      notify("Post deleted");
    } catch {
      notify("The post could not be deleted. Please try again.");
    }
  }
  function copyFromMenu(post: Post) {
    navigator.clipboard.writeText(
      `“${post.body}” — ${post.author} on SpeakUp\n${getPostUrl(post)}`,
    );
    setOpenMenu(null);
    notify("Post text copied");
  }
  function setDraft(postId: string, value: string) {
    setCommentDrafts((current) => ({ ...current, [postId]: value }));
  }

  async function addComment(id: string) {
    const text = (commentDrafts[id] || "").trim();
    if (!text) return;
    const parent = replyTargets[id] || null;
    const localId = crypto.randomUUID();
    setPosts((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: localId,
                  author: anonymousAccount ? "Anonymous" : displayName,
                  body: text,
                  createdAt: new Date().toISOString(),
                  parentCommentId: parent?.id ?? null,
                  likes: 0,
                  liked: false,
                },
              ],
            }
          : p,
      ),
    );
    setDraft(id, "");
    setReplyTargets((current) => ({ ...current, [id]: null }));
    try {
      const remoteComment = await createRemoteComment(id, text, parent?.id);
      if (remoteComment)
        setPosts((current) =>
          current.map((post) =>
            post.id === id
              ? {
                  ...post,
                  comments: post.comments.map((item) =>
                    item.id === localId
                      ? {
                          ...item,
                          id: remoteComment.id,
                          author: remoteComment.anonymous ? "Anonymous" : item.author,
                        }
                      : item,
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
  async function toggleCommentLike(postId: string, commentId: string) {
    const post = posts.find((item) => item.id === postId);
    const target = post?.comments.find((item) => item.id === commentId);
    if (!target) return;
    const nextLiked = !target.liked;
    const applyLike = (liked: boolean, likes: number) =>
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? {
                ...item,
                comments: item.comments.map((entry) =>
                  entry.id === commentId ? { ...entry, liked, likes } : entry,
                ),
              }
            : item,
        ),
      );
    applyLike(nextLiked, target.likes + (nextLiked ? 1 : -1));
    if (postId.startsWith("seed-")) return;
    try {
      await setRemoteCommentLike(commentId, nextLiked);
    } catch {
      applyLike(Boolean(target.liked), target.likes);
      notify("The response like could not be saved");
    }
  }
  function threadComments(comments: Comment[]) {
    const roots = comments.filter((item) => !item.parentCommentId);
    const rootIds = new Set(roots.map((item) => item.id));
    const threaded = roots.flatMap((root) => [
      root,
      ...comments.filter((item) => item.parentCommentId === root.id),
    ]);
    // Replies whose parent is not loaded still deserve to be readable.
    return [
      ...threaded,
      ...comments.filter((item) => item.parentCommentId && !rootIds.has(item.parentCommentId)),
    ];
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
  function splitShareText(text: string, limit: number) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let chunk = "";
    for (const word of words) {
      const next = chunk ? `${chunk} ${word}` : word;
      if (next.length > limit && chunk) {
        const sentenceBreak = Math.max(
          chunk.lastIndexOf(". "),
          chunk.lastIndexOf("? "),
          chunk.lastIndexOf("! "),
          chunk.lastIndexOf("; "),
        );
        if (sentenceBreak > limit * 0.48) {
          chunks.push(chunk.slice(0, sentenceBreak + 1).trim());
          chunk = `${chunk.slice(sentenceBreak + 1).trim()} ${word}`.trim();
        } else {
          chunks.push(chunk);
          chunk = word;
        }
      } else chunk = next;
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }
  async function createShareCards(post: Post) {
    await document.fonts.ready;
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
    const postSeed = [...post.id].reduce((total, character) => total + character.charCodeAt(0), 0);
    const mainChunks = splitShareText(post.quote || post.body, post.quote ? 410 : 430);
    const supportingChunks = post.quote ? splitShareText(post.body, 300) : [];
    const pages: Array<{ main?: string; supporting?: string }> = mainChunks.map((main) => ({
      main,
    }));
    if (supportingChunks.length) {
      const finalMainPage = pages[pages.length - 1];
      if ((finalMainPage.main?.length ?? 0) <= 220 && supportingChunks[0].length <= 220) {
        finalMainPage.supporting = supportingChunks.shift();
      }
      pages.push(...supportingChunks.map((supporting) => ({ supporting })));
    }
    const mark = await loadImage("/assets/brand/hand-lantern-mark.png");
    const palette = [
      { bg: "#ffffff", fg: "#0b0b0b" },
      { bg: "#dedbd2", fg: "#0b0b0b" },
      { bg: "#494949", fg: "#ffffff" },
      { bg: "#0b0b0b", fg: "#ffffff" },
    ];
    const imageSources = [
      "/assets/brand/carry-the-light.png",
      "/assets/brand/share-the-light.png",
      "/assets/brand/step-into-light.png",
    ];
    const firstImageIndex = postSeed % imageSources.length;
    const rotatedImageSources = [
      ...imageSources.slice(firstImageIndex),
      ...imageSources.slice(0, firstImageIndex),
    ];
    const backgroundSequence: Array<
      | { kind: "image"; image: HTMLImageElement }
      | { kind: "color"; theme: (typeof palette)[number] }
    > = [
      ...(await Promise.all(rotatedImageSources.map(loadImage))).map((image) => ({
        kind: "image" as const,
        image,
      })),
      ...palette.map((theme) => ({ kind: "color" as const, theme })),
    ];
    return Promise.all(
      pages.map(async (page, pageIndex) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d")!;
        const background = backgroundSequence[pageIndex % backgroundSequence.length];
        const light = background.kind === "image" ? "#ffffff" : background.theme.fg;
        if (background.kind === "image") {
          const { image } = background;
          const scale = Math.max(1080 / image.width, 1080 / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          ctx.drawImage(image, (1080 - width) / 2, (1080 - height) / 2, width, height);
          const shade = ctx.createLinearGradient(0, 0, 0, 1080);
          shade.addColorStop(0, "rgba(0,0,0,.42)");
          shade.addColorStop(0.5, "rgba(0,0,0,.62)");
          shade.addColorStop(1, "rgba(0,0,0,.92)");
          ctx.fillStyle = shade;
          ctx.fillRect(0, 0, 1080, 1080);
        } else {
          const { theme } = background;
          ctx.fillStyle = theme.bg;
          ctx.fillRect(0, 0, 1080, 1080);
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
        ctx.fillText(`0${pageIndex + 1}  /  ${post.topic.toUpperCase()}`, 74, 90);
        ctx.textBaseline = "alphabetic";
        let contentBottom = 170;
        if (page.main) {
          const fontSize =
            page.main.length > 340
              ? 40
              : page.main.length > 260
                ? 45
                : page.main.length > 170
                  ? 52
                  : 66;
          const lineHeight = fontSize * 1.16;
          ctx.font = `400 ${fontSize}px ${flexing}`;
          const lines = wrapText(ctx, `“${page.main}”`, 900).slice(0, page.supporting ? 7 : 12);
          lines.forEach((line, index) => ctx.fillText(line, 74, 190 + index * lineHeight));
          contentBottom = 190 + lines.length * lineHeight;
        }
        if (page.supporting) {
          const startY = page.main ? Math.max(570, contentBottom + 28) : 205;
          ctx.font = `450 34px ${sans}`;
          ctx.globalAlpha = 0.86;
          const supporting = wrapText(ctx, page.supporting, 900).slice(0, page.main ? 7 : 15);
          supporting.forEach((line, index) => ctx.fillText(line, 74, startY + index * 47));
          ctx.globalAlpha = 1;
        }
        ctx.font = `700 19px ${sans}`;
        ctx.globalAlpha = 0.66;
        ctx.fillText(`${pageIndex + 1} / ${pages.length}`, 930, 90);
        ctx.globalAlpha = 1;
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
        const markHeight = 84;
        const markWidth = markHeight * (mark.naturalWidth / mark.naturalHeight);
        ctx.save();
        ctx.globalAlpha = 0.92;
        if (light === "#ffffff") ctx.filter = "invert(1)";
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
      }),
    );
  }
  async function nativeShare(post: Post) {
    shareCards.forEach((card) => URL.revokeObjectURL(card.url));
    setShareCards([]);
    setSharePost(post);
    setShareCardIndex(0);
    setOpenMenu(null);
    setShareCards(await createShareCards(post));
  }
  async function shareViaDevice(post: Post) {
    const cards = shareCards.length ? shareCards : await createShareCards(post);
    const files = cards.map(
      (card, index) =>
        new File([card.blob], `speakup-${post.id}-${index + 1}.png`, { type: "image/png" }),
    );
    const payload = {
      title: "A thought from SpeakUp",
      text: post.body,
      url: getPostUrl(post),
    };
    try {
      if (navigator.canShare?.({ ...payload, files })) await navigator.share({ ...payload, files });
      else if (navigator.share) await navigator.share(payload);
      else notify("Sharing is not supported on this device");
    } catch (error) {
      // A user dismissing the share sheet is not a failure worth reporting.
      if ((error as Error)?.name !== "AbortError") notify("Sharing could not be completed");
    }
  }
  function closeShare() {
    shareCards.forEach((card) => URL.revokeObjectURL(card.url));
    setSharePost(null);
    setShareCards([]);
    setShareCardIndex(0);
  }
  async function downloadShareCards(post: Post) {
    if (shareCards.length === 1) {
      const link = document.createElement("a");
      link.download = `speakup-${post.id}.png`;
      link.href = shareCards[0].url;
      link.click();
      return;
    }

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    shareCards.forEach((card, index) =>
      zip.file(`speakup-${post.id}-${index + 1}-of-${shareCards.length}.png`, card.blob),
    );
    const archive = await zip.generateAsync({ type: "blob" });
    const archiveUrl = URL.createObjectURL(archive);
    const link = document.createElement("a");
    link.download = `speakup-${post.id}-cards.zip`;
    link.href = archiveUrl;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(archiveUrl), 1000);
  }
  function copyPost(post: Post) {
    navigator.clipboard.writeText(
      `“${post.body}” — ${post.author} on SpeakUp\n${getPostUrl(post)}`,
    );
    setSharePost(null);
  }

  return (
    <main className="community-app">
      <aside className="community-sidebar">
        <Link href="/" aria-label="Back to SpeakUp home">
          <BrandLogo />
        </Link>
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
        <button className="community-primary" onClick={beginPost}>
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
          <Link className="community-mobile-logo" href="/" aria-label="SpeakUp home">
            <BrandLogo compact />
          </Link>
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
          <button className="mobile-compose" onClick={beginPost}>
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
          <button className="composer-prompt" onClick={beginPost}>
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
                  {profileStats
                    ? profileStats.thoughts
                    : posts.filter((post) => post.ownedByMe).length}
                </b>
                <span>Thoughts</span>
              </article>
              <article>
                <b>{profileStats ? profileStats.saved : savedPosts.size}</b>
                <span>Saved</span>
              </article>
              <article>
                <b>
                  {profileStats ? profileStats.liked : posts.filter((post) => post.liked).length}
                </b>
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
            <p>
              Search every thought by phrase or topic, then narrow the results with the topic bar.
            </p>
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
                  if (item.postId) router.push(`/community/post/${item.postId}`);
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
                            {post.ownedByMe && (
                              <>
                                <button onClick={() => editPost(post)}>
                                  <Icon icon={Edit02Icon} />
                                  Edit post
                                </button>
                                <button className="destructive" onClick={() => deletePost(post.id)}>
                                  <Icon icon={Delete02Icon} />
                                  Delete post
                                </button>
                              </>
                            )}
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
                  {(post.media ?? []).map((media) =>
                    media.kind === "video" ? (
                      <video
                        className="community-post__media"
                        key={media.id}
                        src={media.url}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <audio
                        className="community-post__audio"
                        key={media.id}
                        src={media.url}
                        controls
                        preload="metadata"
                      />
                    ),
                  )}
                  {!post.id.startsWith("seed-") && (
                    <a className="post-permalink" href={`/community/post/${post.id}`}>
                      Open conversation ↗
                    </a>
                  )}
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
                        {threadComments(post.comments).map((c) => (
                          <div
                            className={`comment ${c.parentCommentId ? "is-reply" : ""}`}
                            key={c.id}
                          >
                            <span>{c.author[0]}</span>
                            <div className="comment-body">
                              <p>
                                <b>{c.author}</b>
                                {c.body}
                              </p>
                              <div className="comment-meta">
                                {c.createdAt && <time>{relativeTime(c.createdAt)}</time>}
                                <button
                                  className={c.liked ? "liked" : ""}
                                  onClick={() => toggleCommentLike(post.id, c.id)}
                                  aria-label={c.liked ? "Unlike response" : "Like response"}
                                >
                                  <Icon icon={FavouriteIcon} size={13} />
                                  {c.likes || "Like"}
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyTargets((current) => ({ ...current, [post.id]: c }));
                                    setOpenComments(post.id);
                                  }}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {replyTargets[post.id] && (
                          <div className="comment-reply-target">
                            <span>Replying to {replyTargets[post.id]?.author}</span>
                            <button
                              onClick={() =>
                                setReplyTargets((current) => ({ ...current, [post.id]: null }))
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        <div className="comment-box">
                          <input
                            value={commentDrafts[post.id] || ""}
                            onChange={(e) => setDraft(post.id, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addComment(post.id)}
                            placeholder={
                              replyTargets[post.id]
                                ? `Reply to ${replyTargets[post.id]?.author}…`
                                : "Add to the conversation…"
                            }
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
        {view !== "profile" &&
          view !== "notices" &&
          !visible.length &&
          !loadingFeed &&
          !searching && (
            <div className="empty-feed">
              <h2>
                {view === "saved"
                  ? "Nothing saved yet."
                  : searchTerm
                    ? "No thoughts match that."
                    : "The feed is quiet."}
              </h2>
              <p>
                {view === "saved"
                  ? "Use the bookmark on a post to keep it here."
                  : "Try another search or begin the conversation yourself."}
              </p>
            </div>
          )}
        {(loadingFeed || searching) && view !== "profile" && view !== "notices" && (
          <div className="community-status">
            {searching ? "Searching the community…" : "Bringing the latest thoughts to light…"}
          </div>
        )}
        {backendError && (
          <div className="community-status community-status--error">{backendError}</div>
        )}
        {hasMore && view === "feed" && !loadingFeed && !searchResults && (
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
          <Link href="/#values">
            Read our values <span>↗</span>
          </Link>
        </div>
        {trending.length > 0 && (
          <div className="side-card">
            <p className="section-label">TRENDING IN THE LIGHT</p>
            {trending.map((item, i) => (
              <button
                onClick={() => {
                  setFilter(topics.includes(item.topic) ? item.topic : "For you");
                  setSearch(topics.includes(item.topic) ? "" : item.topic);
                  setView("feed");
                }}
                key={item.topic}
              >
                <span>0{i + 1}</span>
                <p>
                  <b>{item.topic}</b>
                  <small>
                    {item.count} {item.count === 1 ? "thought" : "thoughts"}
                  </small>
                </p>
              </button>
            ))}
          </div>
        )}
        <p className="community-foot">© 2026 SPEAKUP · TRUTH, UNSCRIPTED.</p>
      </aside>

      <AnimatePresence>
        {composer && (
          <div className="modal-wrap" role="presentation" onMouseDown={closeComposer}>
            <motion.form
              className="compose-modal"
              ref={composerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compose-title"
              onSubmit={publish}
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
            >
              <header>
                <div>
                  <p className="section-label">{editingPostId ? "EDIT THOUGHT" : "NEW THOUGHT"}</p>
                  <h2 id="compose-title">
                    {editingPostId ? "Refine your thought." : "Bring it to light."}
                  </h2>
                  <p className="compose-intro">
                    Share what you&apos;re learning, questioning, or seeing more clearly.
                  </p>
                </div>
                <button
                  className="compose-close"
                  type="button"
                  onClick={closeComposer}
                  aria-label="Close"
                >
                  <Icon icon={Cancel01Icon} />
                </button>
              </header>
              <div className="compose-author">
                <span>
                  {anonymousAccount || anonymous ? (
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
                  <b>{anonymousAccount || anonymous ? "Anonymous" : displayName}</b>
                  <small>
                    {anonymousAccount
                      ? "Guest accounts always post anonymously"
                      : anonymous
                        ? "Your identity will be protected"
                        : "Posting to the SpeakUp community"}
                  </small>
                </p>
              </div>
              <div className="compose-fields">
                <label>
                  <span>MAIN THOUGHT</span>
                  <textarea
                    className="compose-main"
                    data-autofocus
                    value={mainText}
                    onChange={(e) => setMainText(e.target.value)}
                    maxLength={800}
                    placeholder="What truth are you bringing to light?"
                  />
                </label>
                <label>
                  <span>SUPPORTING CONTEXT</span>
                  <textarea
                    className="compose-context"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={1200}
                    placeholder="Add the context, question, or reflection beneath it…"
                  />
                </label>
              </div>
              {!editingPostId && (
                <div className="compose-media">
                  <input
                    ref={mediaInputRef}
                    type="file"
                    hidden
                    accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg"
                    onChange={(event) => chooseMedia(event.target.files?.[0])}
                  />
                  {!mediaFile ? (
                    <div className="compose-media__actions">
                      <button type="button" onClick={() => mediaInputRef.current?.click()}>
                        <Icon icon={Video01Icon} /> Add video or audio
                      </button>
                      <button
                        type="button"
                        className={recording ? "is-recording" : ""}
                        onClick={recording ? stopRecording : startRecording}
                      >
                        <Icon icon={recording ? AudioWaveformIcon : FileAudioIcon} />
                        {recording ? "Stop recording" : "Record audio"}
                      </button>
                    </div>
                  ) : (
                    <div className="compose-media__preview">
                      {mediaFile.type.startsWith("video/") ? (
                        <video src={mediaPreview} controls playsInline />
                      ) : (
                        <audio src={mediaPreview} controls />
                      )}
                      <div>
                        <span>{mediaFile.name}</span>
                        <small>{(mediaFile.size / 1024 / 1024).toFixed(1)} MB</small>
                        <button type="button" onClick={clearMedia}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  <small>MP4/WebM video up to 100 MB · audio up to 25 MB</small>
                </div>
              )}
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
                <label className={`anonymous-toggle ${anonymousAccount ? "is-locked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={anonymousAccount || anonymous}
                    disabled={anonymousAccount}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  <span>
                    <Icon icon={AnonymousIcon} />
                  </span>
                  <p>
                    <b>Post anonymously</b>
                    <small>
                      {anonymousAccount
                        ? "Sign in to post under your name"
                        : "Hide your name on this thought"}
                    </small>
                  </p>
                </label>
              </div>
              <footer>
                <small>
                  <b>{mainText.length + body.length}</b> / 2000 characters
                </small>
                <button
                  className="community-primary"
                  disabled={mediaUploading || (!mainText.trim() && !body.trim())}
                  type="submit"
                >
                  {editingPostId ? "Save changes" : "Publish thought"} <Icon icon={SentIcon} />
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
              ref={identityRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="identity-title"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <button
                className="modal-close"
                onClick={() => setIdentityOpen(false)}
                aria-label="Close"
              >
                <Icon icon={Cancel01Icon} />
              </button>
              <p className="section-label">YOUR IDENTITY</p>
              <h2 id="identity-title">Come as you are.</h2>
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
                  window.localStorage.setItem("speakup-display-name", nextDisplayName);
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
          <div className="modal-wrap" onMouseDown={closeShare}>
            <motion.div
              className="share-modal share-modal--card"
              ref={shareRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-title"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <button className="modal-close" onClick={closeShare} aria-label="Close">
                <Icon icon={Cancel01Icon} />
              </button>
              <p className="section-label">SHARE THE LIGHT</p>
              <h2 id="share-title">Carry it further.</h2>
              {shareCards.length > 0 && (
                <div className="share-carousel">
                  <button
                    type="button"
                    aria-label="Previous share card"
                    disabled={shareCardIndex === 0}
                    onClick={() => setShareCardIndex((index) => Math.max(0, index - 1))}
                  >
                    <Icon icon={ArrowLeft01Icon} />
                  </button>
                  <img
                    className="share-preview"
                    src={shareCards[shareCardIndex].url}
                    alt={`Branded SpeakUp card ${shareCardIndex + 1} of ${shareCards.length}`}
                  />
                  <button
                    className="share-carousel__next"
                    type="button"
                    aria-label="Next share card"
                    disabled={shareCardIndex === shareCards.length - 1}
                    onClick={() =>
                      setShareCardIndex((index) => Math.min(shareCards.length - 1, index + 1))
                    }
                  >
                    <Icon icon={ArrowLeft01Icon} />
                  </button>
                  <small>
                    {shareCardIndex + 1} / {shareCards.length}
                  </small>
                </div>
              )}
              <div className="share-grid">
                {canNativeShare && (
                  <button
                    className="share-native"
                    onClick={() => shareViaDevice(sharePost)}
                    disabled={!shareCards.length}
                  >
                    <Icon icon={SentIcon} />
                    Share to apps
                  </button>
                )}
                <button onClick={() => downloadShareCards(sharePost)} disabled={!shareCards.length}>
                  <Icon icon={Share08Icon} />
                  {shareCards.length > 1 ? `Download all ${shareCards.length}` : "Download card"}
                </button>
                <a
                  target="_blank"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePost.body)}&url=${encodeURIComponent(getPostUrl(sharePost))}`}
                >
                  <Icon icon={NewTwitterIcon} />X
                </a>
                <a
                  target="_blank"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostUrl(sharePost))}`}
                >
                  <Icon icon={Facebook01Icon} />
                  Facebook
                </a>
                <a
                  target="_blank"
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getPostUrl(sharePost))}`}
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
