import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/community",
    name: "SpeakUp — Truth, Unscripted",
    short_name: "SpeakUp",
    description: "A thoughtful Christian community carrying truth beyond the walls.",
    start_url: "/community",
    scope: "/",
    display: "standalone",
    background_color: "#e9e6df",
    theme_color: "#0b0b0b",
    categories: ["social", "education", "lifestyle"],
    icons: [
      {
        src: "/speakup-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/speakup-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
