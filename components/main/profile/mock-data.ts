export const MOCK_STATS = {
  totalHours: 124,
  streakDays: 12,
  wordsLearned: 450,
  weeklyActivity: [
    { day: "Mon", minutes: 30 },
    { day: "Tue", minutes: 45 },
    { day: "Wed", minutes: 60 },
    { day: "Thu", minutes: 25 },
    { day: "Fri", minutes: 90 },
    { day: "Sat", minutes: 120 },
    { day: "Sun", minutes: 80 },
  ],
};

export const MOCK_RECENT_PODCASTS = [
  {
    id: 1,
    title: "The Daily Life of a Programmer",
    author: "Tech Talk",
    progress: 75,
    thumbnailUrl: "/static/images/podcast-light.png",
  },
  {
    id: 2,
    title: "Learn English with Movies",
    author: "English 101",
    progress: 30,
    thumbnailUrl: "/static/images/podcast-dark.png",
  },
  {
    id: 3,
    title: "Global News Roundup",
    author: "World News",
    progress: 100,
    thumbnailUrl: "/static/images/episode-light.png",
  },
];
