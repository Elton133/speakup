import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "../../../components/brand-logo";
import { ConversationActions } from "./conversation-actions";
import { getConversationPost } from "./data";
import "./post.css";

type Props = { params: Promise<{ id: string }> };

function excerpt(value: string, length = 180) {
  return value.length > length ? `${value.slice(0, length - 1).trim()}…` : value;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getConversationPost(id);
  if (!post) return { title: "Conversation not found — SpeakUp" };
  const title = excerpt(post.quote || post.body, 70);
  const description = excerpt(post.quote ? post.body : post.body);
  return {
    title: `${title} — SpeakUp`,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const post = await getConversationPost(id);
  if (!post) notFound();

  return (
    <main className="conversation-page">
      <header className="conversation-header">
        <Link href="/" aria-label="SpeakUp home">
          <BrandLogo />
        </Link>
        <Link href="/community">← Back to the community</Link>
      </header>
      <article className="conversation-post">
        <div className="conversation-kicker">
          <span>{post.topic}</span>
          <time dateTime={post.createdAt}>
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        {post.quote && <h1>“{post.quote}”</h1>}
        <p className={post.quote ? "conversation-context" : "conversation-primary"}>{post.body}</p>
        <footer>
          <span>{post.anonymous ? "A" : post.author.slice(0, 2).toUpperCase()}</span>
          <div>
            <b>{post.author}</b>
            <small>{post.anonymous ? "Identity protected" : "SpeakUp community member"}</small>
          </div>
        </footer>
      </article>
      <ConversationActions
        postId={post.id}
        initialLikes={post.likes}
        initialLiked={post.liked}
        initialComments={post.comments}
      />
      <footer className="conversation-page-footer">SPEAKUP · TRUTH, UNSCRIPTED.</footer>
    </main>
  );
}
