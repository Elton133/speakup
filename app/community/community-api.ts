import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import type { Post } from "./types";

type PostRow = {
  id: string;
  author_id: string;
  topic: string;
  body: string;
  quote: string | null;
  is_anonymous: boolean;
  created_at: string;
  profiles: { display_name: string } | null;
  comments: Array<{
    id: string;
    body: string;
    is_anonymous: boolean;
    created_at: string;
    parent_comment_id: string | null;
    profiles: { display_name: string } | null;
    comment_likes: Array<{ user_id: string }>;
  }>;
  post_likes: Array<{ user_id: string }>;
};

const POST_SELECT =
  "id,author_id,topic,body,quote,is_anonymous,created_at," +
  "profiles!posts_author_id_fkey(display_name)," +
  "comments(id,body,is_anonymous,created_at,parent_comment_id," +
  "profiles!comments_author_id_fkey(display_name),comment_likes(user_id))," +
  "post_likes(user_id)";

// Commas and parentheses delimit filters inside an `or(...)` group, and % / _
// are ilike wildcards. Drop them so a search phrase stays a search phrase.
function escapeSearchTerm(term: string) {
  return term.replace(/[,()%_\\*]/g, " ").replace(/\s+/g, " ").trim();
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function relativeTime(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  return `${Math.floor(hours / 24)} d`;
}

async function ensureCommunityUser() {
  const supabase = createClient();
  const { data: current, error: getUserError } = await supabase.auth.getUser();
  if (getUserError) throw getUserError;
  if (current.user) return { supabase, user: current.user };

  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { display_name: "Anonymous member" } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Anonymous session could not be created.");
  return { supabase, user: data.user };
}

export type CommunityNotice = {
  id: string;
  kind: "comment" | "like" | "community";
  message: string;
  postId?: string;
  isRead: boolean;
  time: string;
};

export async function loadCommunity(
  page = 0,
  pageSize = 10,
  options: { search?: string; topic?: string } = {},
): Promise<{
  posts: Post[];
  saved: string[];
  user: User | null;
  displayName: string | null;
  hasMore: boolean;
}> {
  if (!isSupabaseConfigured)
    return { posts: [], saved: [], user: null, displayName: null, hasMore: false };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let query = supabase.from("posts").select(POST_SELECT);

  const term = escapeSearchTerm(options.search ?? "");
  if (term)
    query = query.or(`body.ilike.%${term}%,quote.ilike.%${term}%,topic.ilike.%${term}%`);
  if (options.topic) query = query.eq("topic", options.topic);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;

  let saved: string[] = [];
  let displayName: string | null = null;
  if (user) {
    const [{ data: savedRows }, { data: profile }] = await Promise.all([
      supabase.from("saved_posts").select("post_id"),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);
    saved = savedRows?.map((row) => row.post_id as string) ?? [];
    displayName = (profile?.display_name as string | undefined) ?? null;
  }

  return {
    user,
    displayName,
    saved,
    hasMore: (data?.length ?? 0) === pageSize,
    posts: ((data ?? []) as unknown as PostRow[]).map((row) => {
      const name = row.is_anonymous ? "Anonymous" : row.profiles?.display_name || "SpeakUp member";
      return {
        id: row.id,
        author: name,
        handle: row.is_anonymous ? "Identity protected" : "Community member",
        initials: row.is_anonymous ? "A" : initials(name),
        anonymous: row.is_anonymous,
        time: relativeTime(row.created_at),
        topic: row.topic,
        body: row.body,
        quote: row.quote || undefined,
        likes: row.post_likes.length,
        liked: Boolean(user && row.post_likes.some((like) => like.user_id === user.id)),
        ownedByMe: Boolean(user && row.author_id === user.id),
        comments: row.comments
          .map((comment) => ({
            id: comment.id,
            author: comment.is_anonymous ? "Anonymous" : comment.profiles?.display_name || "Member",
            body: comment.body,
            createdAt: comment.created_at,
            parentCommentId: comment.parent_comment_id,
            likes: comment.comment_likes.length,
            liked: Boolean(
              user && comment.comment_likes.some((like) => like.user_id === user.id),
            ),
          }))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      };
    }),
  };
}

export function subscribeToCommunity(onChange: () => void) {
  if (!isSupabaseConfigured) return () => undefined;
  const supabase = createClient();
  const channel = supabase
    .channel("speakup-community-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToNotifications(userId: string, onChange: () => void) {
  if (!isSupabaseConfigured) return () => undefined;
  const supabase = createClient();
  const channel = supabase
    .channel("speakup-notification-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function loadProfileStats() {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [thoughts, saved, liked] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    supabase.from("saved_posts").select("post_id", { count: "exact", head: true }),
    supabase
      .from("post_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return {
    thoughts: thoughts.count ?? 0,
    saved: saved.count ?? 0,
    liked: liked.count ?? 0,
  };
}

export async function loadTrendingTopics(sampleSize = 300) {
  if (!isSupabaseConfigured) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("topic")
    .order("created_at", { ascending: false })
    .limit(sampleSize);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const topic = row.topic as string;
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export async function loadNotifications(): Promise<CommunityNotice[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id,kind,message,post_id,is_read,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as CommunityNotice["kind"],
    message: row.message as string,
    postId: (row.post_id as string | null) || undefined,
    isRead: row.is_read as boolean,
    time: relativeTime(row.created_at as string),
  }));
}

export async function markNotificationRead(id?: string) {
  const supabase = createClient();
  let query = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (id) query = query.eq("id", id);
  const { error } = await query;
  if (error) throw error;
}

export async function reportRemotePost(postId: string, reason = "other") {
  if (postId.startsWith("seed-")) return false;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { error } = await supabase
    .from("reports")
    .upsert(
      { reporter_id: data.user.id, post_id: postId, reason },
      { onConflict: "reporter_id,post_id" },
    );
  if (error) throw error;
  return true;
}

export async function deleteRemotePost(postId: string) {
  if (postId.startsWith("seed-")) return false;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;

  const { data: deleted, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", data.user.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(deleted);
}

export async function updateRemotePost(
  postId: string,
  input: { topic: string; body: string; quote?: string; anonymous: boolean },
) {
  if (postId.startsWith("seed-")) return false;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const isAnonymous = Boolean(data.user.is_anonymous || input.anonymous);

  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      topic: input.topic,
      body: input.body,
      quote: input.quote || null,
      is_anonymous: isAnonymous,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("author_id", data.user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "42501") {
      throw new Error("Post editing permission is not installed. Apply migration 202608100007.");
    }
    throw error;
  }
  return updated ? { anonymous: isAnonymous } : false;
}

export async function updateRemoteProfile(displayName: string) {
  const { supabase, user } = await ensureCommunityUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);
  if (error) throw error;
  return true;
}

export async function createRemotePost(input: {
  topic: string;
  body: string;
  quote?: string;
  anonymous: boolean;
}) {
  const { supabase, user } = await ensureCommunityUser();
  const isAnonymous = Boolean(user.is_anonymous || input.anonymous);
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      topic: input.topic,
      body: input.body,
      quote: input.quote || null,
      is_anonymous: isAnonymous,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: post.id as string, anonymous: isAnonymous };
}

export async function setRemoteLike(postId: string, liked: boolean) {
  if (postId.startsWith("seed-")) return false;
  const { supabase, user } = await ensureCommunityUser();
  const query = supabase.from("post_likes");
  const { error } = liked
    ? await query.insert({ post_id: postId, user_id: user.id })
    : await query.delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) throw error;
  return true;
}

export async function setRemoteSaved(postId: string, saved: boolean) {
  if (postId.startsWith("seed-")) return false;
  const { supabase, user } = await ensureCommunityUser();
  const query = supabase.from("saved_posts");
  const { error } = saved
    ? await query.insert({ post_id: postId, user_id: user.id })
    : await query.delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) throw error;
  return true;
}

export async function createRemoteComment(postId: string, body: string, parentCommentId?: string) {
  if (postId.startsWith("seed-")) return null;
  const { supabase, user } = await ensureCommunityUser();
  const isAnonymous = Boolean(user.is_anonymous);
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      body,
      is_anonymous: isAnonymous,
      parent_comment_id: parentCommentId || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: comment.id as string, anonymous: isAnonymous };
}

export async function setRemoteCommentLike(commentId: string, liked: boolean) {
  const { supabase, user } = await ensureCommunityUser();
  const query = supabase.from("comment_likes");
  const { error } = liked
    ? await query.insert({ comment_id: commentId, user_id: user.id })
    : await query.delete().eq("comment_id", commentId).eq("user_id", user.id);
  if (error) throw error;
  return true;
}
