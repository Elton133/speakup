import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const flexing = localFont({
  src: [
    { path: "../public/assets/flexing-font-2/flexing-regular.ttf", weight: "400" },
    { path: "../public/assets/flexing-font-2/flexing-bold.ttf", weight: "700" },
    { path: "../public/assets/flexing-font-2/flexing-black.ttf", weight: "900" },
  ],
  variable: "--font-flexing",
  display: "swap",
});

const googleSans = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-google-sans-flex",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "SpeakUp — Truth, Unscripted",
  description:
    "A thoughtful Christian community for truth, honest questions, and carrying the light beyond church walls.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${flexing.variable} ${googleSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
