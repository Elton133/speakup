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
    profiles: { display_name: string } | null;
  }>;
  post_likes: Array<{ user_id: string }>;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  return `${Math.floor(hours / 24)} d`;
}

export async function loadCommunity(): Promise<{
  posts: Post[];
  saved: string[];
  user: User | null;
}> {
  if (!isSupabaseConfigured) return { posts: [], saved: [], user: null };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id,author_id,topic,body,quote,is_anonymous,created_at,profiles!posts_author_id_fkey(display_name),comments(id,body,is_anonymous,profiles!comments_author_id_fkey(display_name)),post_likes(user_id)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  let saved: string[] = [];
  if (user) {
    const { data: savedRows } = await supabase.from("saved_posts").select("post_id");
    saved = savedRows?.map((row) => row.post_id as string) ?? [];
  }

  return {
    user,
    saved,
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
        comments: row.comments.map((comment) => ({
          id: comment.id,
          author: comment.is_anonymous ? "Anonymous" : comment.profiles?.display_name || "Member",
          body: comment.body,
        })),
      };
    }),
  };
}

export async function createRemotePost(input: { topic: string; body: string; anonymous: boolean }) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: data.user.id,
      topic: input.topic,
      body: input.body,
      is_anonymous: input.anonymous,
    })
    .select("id")
    .single();
  if (error) throw error;
  return post.id as string;
}

export async function setRemoteLike(postId: string, liked: boolean) {
  if (postId.startsWith("seed-")) return false;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const query = supabase.from("post_likes");
  const { error } = liked
    ? await query.insert({ post_id: postId, user_id: data.user.id })
    : await query.delete().eq("post_id", postId).eq("user_id", data.user.id);
  if (error) throw error;
  return true;
}

export async function setRemoteSaved(postId: string, saved: boolean) {
  if (postId.startsWith("seed-")) return false;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const query = supabase.from("saved_posts");
  const { error } = saved
    ? await query.insert({ post_id: postId, user_id: data.user.id })
    : await query.delete().eq("post_id", postId).eq("user_id", data.user.id);
  if (error) throw error;
  return true;
}

export async function createRemoteComment(postId: string, body: string) {
  if (postId.startsWith("seed-")) return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: data.user.id, body })
    .select("id")
    .single();
  if (error) throw error;
  return comment.id as string;
}
