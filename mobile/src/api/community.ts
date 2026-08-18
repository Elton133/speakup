import { fetch } from "expo/fetch";
import { supabase } from "@/lib/supabase";

export type CommunityMedia = {
  id: string;
  kind: "video" | "audio" | "image";
  url: string;
  mimeType: string;
};
export type CommunityComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  likes: number;
  liked: boolean;
};
export type CommunityPost = {
  id: string;
  author: string;
  authorId: string;
  topic: string;
  quote?: string;
  body: string;
  likes: number;
  comments: number;
  commentList: CommunityComment[];
  liked: boolean;
  saved: boolean;
  ownedByMe: boolean;
  anonymous: boolean;
  media: CommunityMedia[];
};

type PostRow = {
  id: string;
  author_id: string;
  topic: string;
  body: string;
  quote: string | null;
  is_anonymous: boolean;
  profiles: { display_name: string } | null;
  post_likes: Array<{ user_id: string }>;
  comments: Array<{
    id: string;
    body: string;
    created_at: string;
    is_anonymous: boolean;
    profiles: { display_name: string } | null;
    comment_likes: Array<{ user_id: string }>;
  }>;
  post_media: Array<{
    id: string;
    kind: "video" | "audio" | "image";
    public_url: string;
    mime_type: string;
  }>;
};

const POST_SELECT =
  "id,author_id,topic,body,quote,is_anonymous,profiles!posts_author_id_fkey(display_name),post_likes(user_id),comments(id,body,created_at,is_anonymous,profiles!comments_author_id_fkey(display_name),comment_likes(user_id)),post_media(id,kind,public_url,mime_type)";

export async function ensureCommunityUser() {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;
  const { data: signed, error } = await supabase.auth.signInAnonymously({
    options: { data: { display_name: "Guest seeker" } },
  });
  if (error || !signed.user) throw error || new Error("Anonymous account could not be created.");
  return signed.user;
}

function mapPost(row: PostRow, userId: string | undefined, saved: Set<string>): CommunityPost {
  const anonymous = row.is_anonymous;
  return {
    id: row.id,
    authorId: row.author_id,
    author: anonymous ? "Anonymous" : row.profiles?.display_name || "SpeakUp member",
    topic: row.topic,
    quote: row.quote || undefined,
    body: row.body,
    likes: row.post_likes.length,
    liked: Boolean(userId && row.post_likes.some((like) => like.user_id === userId)),
    comments: row.comments.length,
    saved: saved.has(row.id),
    ownedByMe: row.author_id === userId,
    anonymous,
    commentList: row.comments
      .map((comment) => ({
        id: comment.id,
        author: comment.is_anonymous ? "Anonymous" : comment.profiles?.display_name || "Member",
        body: comment.body,
        createdAt: comment.created_at,
        likes: comment.comment_likes.length,
        liked: Boolean(userId && comment.comment_likes.some((like) => like.user_id === userId)),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    media: (row.post_media || []).map((media) => ({
      id: media.id,
      kind: media.kind,
      url: media.public_url,
      mimeType: media.mime_type,
    })),
  };
}

export async function loadFeed(search = "") {
  const { data: auth } = await supabase.auth.getUser();
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(30);
  const term = search.trim().replace(/[,()%_\\*]/g, " ");
  if (term) query = query.or(`body.ilike.%${term}%,quote.ilike.%${term}%,topic.ilike.%${term}%`);
  const [{ data, error }, { data: savedRows }, { data: blockedRows }] = await Promise.all([
    query,
    auth.user ? supabase.from("saved_posts").select("post_id") : Promise.resolve({ data: [] }),
    auth.user
      ? supabase.from("blocked_members").select("blocked_id").eq("blocker_id", auth.user.id)
      : Promise.resolve({ data: [] }),
  ]);
  if (error) throw error;
  const saved = new Set((savedRows || []).map((row) => row.post_id as string));
  const blocked = new Set((blockedRows || []).map((row) => row.blocked_id as string));
  return ((data || []) as unknown as PostRow[])
    .filter((row) => !blocked.has(row.author_id))
    .map((row) => mapPost(row, auth.user?.id, saved));
}

export async function loadPost(id: string) {
  const { data: auth } = await supabase.auth.getUser();
  const [{ data, error }, { data: savedRow }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("id", id).single(),
    auth.user
      ? supabase.from("saved_posts").select("post_id").eq("post_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (error) throw error;
  return mapPost(data as unknown as PostRow, auth.user?.id, new Set(savedRow ? [id] : []));
}

export async function toggleLike(postId: string, liked: boolean) {
  const user = await ensureCommunityUser();
  const query = supabase.from("post_likes");
  const { error } = liked
    ? await query.insert({ post_id: postId, user_id: user.id })
    : await query.delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) throw error;
}

export async function toggleSaved(postId: string, saved: boolean) {
  const user = await ensureCommunityUser();
  const query = supabase.from("saved_posts");
  const { error } = saved
    ? await query.insert({ post_id: postId, user_id: user.id })
    : await query.delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) throw error;
}

export async function addComment(postId: string, body: string) {
  const user = await ensureCommunityUser();
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    body: body.trim(),
    is_anonymous: Boolean(user.is_anonymous),
  });
  if (error) throw error;
}

export async function createPost(input: {
  topic: string;
  quote?: string;
  body: string;
  anonymous: boolean;
}) {
  const user = await ensureCommunityUser();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      topic: input.topic,
      quote: input.quote || null,
      body: input.body,
      is_anonymous: Boolean(user.is_anonymous || input.anonymous),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function uploadPostMedia(
  postId: string,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number },
) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in before uploading media.");
  const blob = await (await fetch(asset.uri)).blob();
  const mimeType = asset.mimeType || blob.type || "application/octet-stream";
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://speakup.forum";
  const signed = await fetch(`${baseUrl}/api/media/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fileName: asset.fileName || `speakup-${Date.now()}`,
      mimeType,
      size: asset.fileSize || blob.size,
    }),
  });
  const prepared = (await signed.json()) as {
    uploadUrl?: string;
    key?: string;
    publicUrl?: string;
    kind?: string;
    mimeType?: string;
    size?: number;
    error?: string;
  };
  if (!signed.ok || !prepared.uploadUrl)
    throw new Error(prepared.error || "Media upload could not start.");
  const uploaded = await fetch(prepared.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!uploaded.ok) throw new Error("Cloudflare could not receive the media.");
  const user = await ensureCommunityUser();
  const { error } = await supabase.from("post_media").insert({
    post_id: postId,
    uploader_id: user.id,
    kind: prepared.kind,
    object_key: prepared.key,
    public_url: prepared.publicUrl,
    mime_type: prepared.mimeType,
    size_bytes: prepared.size,
  });
  if (error) throw error;
}

export async function loadNotices() {
  const user = await ensureCommunityUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,kind,message,post_id,is_read,created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return data || [];
}

export async function loadProfile() {
  const user = await ensureCommunityUser();
  const [{ data: profile }, { count: thoughts }, { count: saved }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    supabase
      .from("saved_posts")
      .select("post_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  return {
    user,
    displayName: profile?.display_name || user.user_metadata.display_name || "Guest seeker",
    thoughts: thoughts || 0,
    saved: saved || 0,
  };
}

export async function updateDisplayName(displayName: string) {
  const user = await ensureCommunityUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", user.id);
  if (error) throw error;
}

export async function reportPost(
  postId: string,
  reason: "spam" | "harassment" | "misinformation" | "other",
) {
  const user = await ensureCommunityUser();
  const { error } = await supabase
    .from("reports")
    .upsert(
      { reporter_id: user.id, post_id: postId, reason },
      { onConflict: "reporter_id,post_id" },
    );
  if (error) throw error;
}

export async function blockMember(memberId: string) {
  const user = await ensureCommunityUser();
  if (user.id === memberId) throw new Error("You cannot block your own account.");
  const { error } = await supabase
    .from("blocked_members")
    .upsert({ blocker_id: user.id, blocked_id: memberId });
  if (error) throw error;
}

export async function deleteAccount() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("No active account was found.");
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://speakup.forum";
  const response = await fetch(`${baseUrl}/api/account`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Account deletion failed.");
  await supabase.auth.signOut();
}
