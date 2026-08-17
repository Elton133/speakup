export type MobilePost = {
  id: string;
  author: string;
  topic: string;
  quote?: string;
  body: string;
  likes: number;
  comments: number;
  saved?: boolean;
};
export const demoPosts: MobilePost[] = [
  {
    id: "light-shows-up",
    author: "Amara Mensah",
    topic: "Reflection",
    quote: "Light doesn't argue with darkness. It simply shows up.",
    body: "What if our greatest witness isn't winning the argument, but living so truthfully that the contrast becomes undeniable?",
    likes: 248,
    comments: 31,
  },
  {
    id: "outside-walls",
    author: "Anonymous",
    topic: "Beyond the walls",
    quote: "The mission was never meant to end at the church door.",
    body: "What structures can we build that serve people before they ever think of entering a sanctuary?",
    likes: 119,
    comments: 18,
  },
  {
    id: "truth-grace",
    author: "Joel K.",
    topic: "Scripture",
    body: "Speaking truth without love can become another smokescreen. Grace does not weaken truth; it gives truth somewhere to land.",
    likes: 87,
    comments: 12,
  },
];
