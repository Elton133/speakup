# SpeakUp mobile

Native Expo application for the SpeakUp community. The web landing page is intentionally excluded.

## Run locally

1. Copy `.env.example` to `.env.local` and provide the public Supabase values.
2. Run `npm install`.
3. Run `npx expo start` and open the app in Expo Go.

The feed, Liquid Glass/native tabs, audio recording and local notification UI can be reviewed immediately. Remote Android push notifications require a development build, not Expo Go.

## Push notification setup

1. Run `eas init` and retain the generated `extra.eas.projectId` in `app.json`.
2. Confirm the permanent identifiers: `forum.speakup.app` for both iOS and Android.
3. Create the Android application in Firebase and download `google-services.json`.
4. Add `android.googleServicesFile` to `app.json` after placing the file locally.
5. Upload the FCM v1 service-account credential through `eas credentials`.
6. Configure the Apple push key through EAS for iOS.
7. Create a development build with `eas build --profile development --platform android`.

The client stores an Expo push token in the existing `push_subscriptions` table. The SpeakUp admin announcement endpoint sends web subscriptions through Web Push and mobile subscriptions through Expo Push Service; FCM v1 and APNs provide platform delivery underneath Expo Push.

## Current milestone

- Native Home, Explore, Speak, Notices and Profile tabs
- iOS 26 Liquid Glass tab chrome with native Android Material navigation
- Flexing brand font, SpeakUp icon and lantern assets
- Feed/post-detail presentation with Hugeicons actions
- Audio reflection recording with `expo-audio`
- Notification permission, channel, token registration and deep-link handling
- Active/dull lantern streak component
- Encrypted, persistent Supabase sessions and anonymous accounts
- Google identity linking that preserves an anonymous member's existing content
- Live feed/search, likes, saves, comments, notices and profile identity
- Live publishing with Cloudflare R2 video/audio uploads
- React Query caching, refresh and mutation state

Apply `supabase/migrations/202608170010_light_progress.sql`, add `speakup://**` to the Supabase Auth redirect allow list, and enable manual identity linking in Supabase Auth settings before testing anonymous-to-Google conversion.
