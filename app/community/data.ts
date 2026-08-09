import type { Post } from "./types";

export const topics = [
  "For you",
  "Scripture",
  "Reflection",
  "Questions",
  "Culture",
  "Beyond the walls",
];

export const seedPosts: Post[] = [
  {
    id: 1,
    author: "Amara Mensah",
    handle: "@amaralights",
    initials: "AM",
    time: "18 min",
    topic: "Reflection",
    quote: "Light doesn't argue with darkness. It simply shows up.",
    body: "What if our greatest witness isn't winning the argument, but living so truthfully that the contrast becomes undeniable? I keep returning to the quiet courage of consistency.",
    likes: 248,
    comments: [
      {
        id: 11,
        author: "Joel K.",
        body: "This is the kind of witness people can actually feel.",
      },
    ],
  },
  {
    id: 2,
    author: "Anonymous",
    handle: "A quiet seeker",
    initials: "A",
    anonymous: true,
    time: "1 hr",
    topic: "Question",
    body: "How do you keep asking honest questions when the people around you treat questions as doubt? I want to grow in faith without pretending I understand everything.",
    likes: 96,
    comments: [],
  },
  {
    id: 3,
    author: "Joel Kato",
    handle: "@joelbeyondwalls",
    initials: "JK",
    time: "3 hr",
    topic: "Beyond the walls",
    body: "The world disciples people seven days a week. What structures can we build that form people at work, online, and in our neighbourhoods—not only on Sunday?",
    likes: 183,
    comments: [
      { id: 31, author: "Nia O.", body: "Small circles around vocation would be a strong start." },
      {
        id: 32,
        author: "Anonymous",
        body: "And practical support systems, not just more meetings.",
      },
    ],
  },
];
