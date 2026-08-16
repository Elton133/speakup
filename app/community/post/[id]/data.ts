import { cache } from "react";
import { createClient } from "../../../../lib/supabase/server";

export type ConversationPost = {
  id: string;
  authorId: string;
  author: string;
  anonymous: boolean;
  topic: string;
  body: string;
  quote: string | null;
  createdAt: string;
  likes: number;
  liked: boolean;
  ownedByMe: boolean;
  media: Array<{
    id: string;
    kind: "video" | "audio";
    url: string;
    mimeType: string;
  }>;
  comments: Array<{
    id: string;
    author: string;
    body: string;
    createdAt: string;
    parentCommentId: string | null;
    likes: number;
    liked: boolean;
  }>;
};

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
  post_media: Array<{
    id: string;
    kind: "video" | "audio";
    public_url: string;
    mime_type: string;
  }>;
};

export const getConversationPost = cache(async (id: string): Promise<ConversationPost | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id,author_id,topic,body,quote,is_anonymous,created_at,profiles!posts_author_id_fkey(display_name),comments(id,body,is_anonymous,created_at,parent_comment_id,profiles!comments_author_id_fkey(display_name),comment_likes(user_id)),post_likes(user_id),post_media(id,kind,public_url,mime_type)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as PostRow;
  const user = auth.user;
  return {
    id: row.id,
    authorId: row.author_id,
    author: row.is_anonymous ? "Anonymous" : row.profiles?.display_name || "SpeakUp member",
    anonymous: row.is_anonymous,
    topic: row.topic,
    body: row.body,
    quote: row.quote,
    createdAt: row.created_at,
    likes: row.post_likes.length,
    liked: Boolean(user && row.post_likes.some((like) => like.user_id === user.id)),
    ownedByMe: Boolean(user && row.author_id === user.id),
    media: (row.post_media ?? []).map((item) => ({
      id: item.id,
      kind: item.kind,
      url: item.public_url,
      mimeType: item.mime_type,
    })),
    comments: row.comments
      .map((comment) => ({
        id: comment.id,
        author: comment.is_anonymous
          ? "Anonymous"
          : comment.profiles?.display_name || "SpeakUp member",
        body: comment.body,
        createdAt: comment.created_at,
        parentCommentId: comment.parent_comment_id,
        likes: comment.comment_likes.length,
        liked: Boolean(
          user && comment.comment_likes.some((commentLike) => commentLike.user_id === user.id),
        ),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
});
