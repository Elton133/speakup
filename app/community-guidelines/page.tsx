import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
export const metadata: Metadata = { title: "Community Guidelines — SpeakUp" };
export default function GuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Community safety"
      title="Add light, not heat."
      intro="Truth can be direct without dehumanizing people. These standards protect honest conversation while leaving room for disagreement and growth."
    >
      <section>
        <h2>Speak with dignity</h2>
        <p>
          Challenge ideas, interpretations, institutions, and systems without harassment,
          humiliation, threats, or attacks based on protected characteristics.
        </p>
      </section>
      <section>
        <h2>Share responsibly</h2>
        <p>
          Give context to quotations, distinguish fact from opinion, correct significant errors,
          respect copyright, and do not coordinate deception or dangerous misinformation.
        </p>
      </section>
      <section>
        <h2>Protect people</h2>
        <p>
          Never expose private information, sexualize minors, encourage self-harm or violence,
          impersonate others, or use the platform to exploit vulnerable people.
        </p>
      </section>
      <section>
        <h2>Keep the space useful</h2>
        <p>
          Avoid repetitive promotion, scams, engagement manipulation, irrelevant advertising, and
          automated spam. Streaks and light points reward meaningful contribution, not volume.
        </p>
      </section>
      <section>
        <h2>Report and block</h2>
        <p>
          Every member can report a post, block its author, or hide content. Reports enter the
          moderation queue. Blocking removes that member’s posts from your feed. Immediate danger
          should be reported to local emergency services.
        </p>
      </section>
      <section>
        <h2>Enforcement</h2>
        <p>
          Actions may include warnings, content removal, reduced visibility, temporary restrictions,
          or account deletion. Severity, context, intent, and prior behavior inform decisions.
          Appeals can be sent to support@speakup.forum.
        </p>
      </section>
    </LegalPage>
  );
}
