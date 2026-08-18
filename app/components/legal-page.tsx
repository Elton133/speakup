import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import "../legal.css";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <header>
        <Link href="/" aria-label="SpeakUp home">
          <BrandLogo />
        </Link>
        <Link href="/community">Community ↗</Link>
      </header>
      <article>
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <p className="legal-date">Last updated August 17, 2026</p>
        {children}
      </article>
      <footer>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/community-guidelines">Community guidelines</Link>
      </footer>
    </main>
  );
}
