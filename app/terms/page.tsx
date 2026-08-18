import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
export const metadata: Metadata = { title: "Terms — SpeakUp" };
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Carry truth responsibly."
      intro="SpeakUp exists for honest Christian thought, scripture, questions, and constructive conversation beyond church walls."
    >
      <section>
        <h2>Using SpeakUp</h2>
        <p>
          You must be at least 13 years old and legally able to accept these terms. Keep account
          access secure and provide accurate information where requested.
        </p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>
          You retain ownership of content you create. You grant SpeakUp a worldwide, non-exclusive
          license to host, reproduce, display, format, and distribute it only as necessary to
          operate and share the service. You must have the right to post what you submit.
        </p>
      </section>
      <section>
        <h2>Conduct</h2>
        <p>
          Do not post threats, harassment, hateful content, sexual exploitation, unlawful material,
          impersonation, spam, malicious misinformation, privacy violations, or content that
          infringes another person’s rights. Anonymous participation does not remove accountability.
        </p>
      </section>
      <section>
        <h2>Moderation</h2>
        <p>
          We may review reports, limit distribution, remove content, suspend interactions, or
          terminate accounts to protect members and the service. Context matters, and disagreement
          alone is not a violation.
        </p>
      </section>
      <section>
        <h2>Service availability</h2>
        <p>
          SpeakUp is provided as available and may change over time. Nothing on the platform is
          professional medical, legal, financial, or pastoral advice. To the extent permitted by
          law, SpeakUp is not liable for indirect losses arising from use of the service.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms or moderation decisions can be sent to support@speakup.forum.
        </p>
      </section>
    </LegalPage>
  );
}
