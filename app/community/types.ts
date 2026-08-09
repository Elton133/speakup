export type Comment = {
  id: string;
  author: string;
  body: string;
};

export type Post = {
  id: string;
  author: string;
  handle: string;
  initials: string;
  anonymous?: boolean;
  time: string;
  topic: string;
  body: string;
  quote?: string;
  likes: number;
  liked?: boolean;
  comments: Comment[];
};
