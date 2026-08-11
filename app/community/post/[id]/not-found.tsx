import Link from "next/link";

export default function ConversationNotFound() {
  return (
    <main className="conversation-missing">
      <p>THIS CONVERSATION IS NO LONGER IN THE LIGHT</p>
      <h1>The post could not be found.</h1>
      <span>It may have been deleted, removed for review, or the link may be incomplete.</span>
      <Link href="/community">Return to the community</Link>
    </main>
  );
}
