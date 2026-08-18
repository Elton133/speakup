import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
export const metadata: Metadata = { title: "Privacy — SpeakUp" };
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Your trust matters."
      intro="This policy explains what SpeakUp collects, why we use it, and the choices you have—including when you participate anonymously."
    >
      <section>
        <h2>Information we collect</h2>
        <p>
          We collect account identifiers, optional display names, posts, comments, reactions,
          reports, saved posts, device push tokens, and media you choose to upload. Google sign-in
          provides basic account information with your permission.
        </p>
      </section>
      <section>
        <h2>Anonymous participation</h2>
        <p>
          An anonymous post hides your public identity from other members. SpeakUp still associates
          activity with an internal account so interactions, safety controls, deletion, and abuse
          prevention work correctly.
        </p>
      </section>
      <section>
        <h2>How information is used</h2>
        <ul>
          <li>Operate conversations, authentication, notifications, saves, streaks, and media.</li>
          <li>
            Moderate reports, investigate abuse, secure accounts, and enforce community rules.
          </li>
          <li>Maintain and improve reliability and user experience.</li>
        </ul>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>
          Supabase provides authentication and database services, Cloudflare stores uploaded media,
          Vercel hosts the web service, and Expo supports mobile builds and notifications. These
          providers process information only to deliver their services.
        </p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          Content remains until deleted by its author, removed through moderation, or deleted with
          the account. Safety records may be retained where reasonably necessary to prevent abuse or
          meet legal obligations. Account deletion is available inside the mobile app.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can edit your display identity, participate anonymously, disable notifications, block
          members, report content, and delete your account. Contact support@speakup.forum for
          privacy requests.
        </p>
      </section>
    </LegalPage>
  );
}
