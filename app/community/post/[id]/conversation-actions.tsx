"use client";

import { FormEvent, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Comment01Icon,
  Copy01Icon,
  FavouriteIcon,
  SentIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { createRemoteComment, setRemoteCommentLike, setRemoteLike } from "../../community-api";

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  parentCommentId: string | null;
  likes: number;
  liked: boolean;
};

export function ConversationActions({
  postId,
  initialLikes,
  initialLiked,
  initialComments,
}: {
  postId: string;
  initialLikes: number;
  initialLiked: boolean;
  initialComments: Comment[];
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((value) => value + (next ? 1 : -1));
    try {
      await setRemoteLike(postId, next);
    } catch {
      setLiked(!next);
      setLikes((value) => value + (next ? -1 : 1));
      notify("The like could not be saved");
    }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    const body = comment.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const created = await createRemoteComment(postId, body, replyingTo?.id);
      if (!created) throw new Error("Comment was not created");
      setComments((current) => [
        ...current,
        {
          id: created.id,
          author: created.anonymous ? "Anonymous" : "You",
          body,
          createdAt: new Date().toISOString(),
          parentCommentId: replyingTo?.id || null,
          likes: 0,
          liked: false,
        },
      ]);
      setComment("");
      setReplyingTo(null);
      notify("Comment added");
    } catch {
      notify("The comment could not be added");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCommentLike(commentId: string) {
    const target = comments.find((item) => item.id === commentId);
    if (!target) return;
    const next = !target.liked;
    setComments((current) =>
      current.map((item) =>
        item.id === commentId
          ? { ...item, liked: next, likes: item.likes + (next ? 1 : -1) }
          : item,
      ),
    );
    try {
      await setRemoteCommentLike(commentId, next);
    } catch {
      setComments((current) =>
        current.map((item) =>
          item.id === commentId ? { ...item, liked: target.liked, likes: target.likes } : item,
        ),
      );
      notify("The response like could not be saved");
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    notify("Conversation link copied");
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "SpeakUp conversation", url: window.location.href });
      return;
    }
    await copyLink();
  }

  const topLevelComments = comments.filter((item) => !item.parentCommentId);
  const threadedComments = topLevelComments.flatMap((parent) => [
    parent,
    ...comments.filter((item) => item.parentCommentId === parent.id),
  ]);
  const displayedComments = [
    ...threadedComments,
    ...comments.filter(
      (item) =>
        item.parentCommentId && !comments.some((parent) => parent.id === item.parentCommentId),
    ),
  ];

  return (
    <section className="conversation-interactions">
      <div className="conversation-actions">
        <button className={liked ? "liked" : ""} onClick={toggleLike}>
          <HugeiconsIcon icon={FavouriteIcon} size={20} strokeWidth={1.7} />
          {likes}
        </button>
        <span>
          <HugeiconsIcon icon={Comment01Icon} size={20} strokeWidth={1.7} />
          {comments.length}
        </span>
        <button onClick={share}>
          <HugeiconsIcon icon={Share08Icon} size={20} strokeWidth={1.7} />
          Share
        </button>
        <button onClick={copyLink}>
          <HugeiconsIcon icon={Copy01Icon} size={20} strokeWidth={1.7} />
          Copy link
        </button>
      </div>

      <form className="conversation-reply" onSubmit={submitComment}>
        <label htmlFor="conversation-comment">
          {replyingTo ? `REPLYING TO ${replyingTo.author.toUpperCase()}` : "JOIN THE CONVERSATION"}
        </label>
        {replyingTo && (
          <button
            className="conversation-reply-cancel"
            type="button"
            onClick={() => setReplyingTo(null)}
          >
            Cancel reply
          </button>
        )}
        <div>
          <textarea
            id="conversation-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={600}
            placeholder="Add light to the conversation…"
          />
          <button disabled={!comment.trim() || busy} type="submit">
            {busy ? "Posting…" : "Post comment"}
            <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={1.7} />
          </button>
        </div>
      </form>

      <div className="conversation-comments">
        <header>
          <p>RESPONSES</p>
          <span>{comments.length}</span>
        </header>
        {comments.length ? (
          displayedComments.map((item) => (
            <article className={item.parentCommentId ? "is-reply" : ""} key={item.id}>
              <span>
                {item.author === "Anonymous" ? "A" : item.author.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b>{item.author}</b>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <p>{item.body}</p>
                <div className="comment-actions">
                  <button
                    className={item.liked ? "liked" : ""}
                    onClick={() => toggleCommentLike(item.id)}
                    type="button"
                  >
                    <HugeiconsIcon icon={FavouriteIcon} size={15} strokeWidth={1.7} />
                    {item.likes || "Like"}
                  </button>
                  <button onClick={() => setReplyingTo(item)} type="button">
                    Reply
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="conversation-empty">
            <h2>Be the first to respond.</h2>
            <p>Add truth, perspective, or a thoughtful question.</p>
          </div>
        )}
      </div>
      {message && <div className="conversation-toast">{message}</div>}
    </section>
  );
}
