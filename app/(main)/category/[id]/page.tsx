"use client";

import ProgramList from "@/components/category/ProgramList";

const samplePrograms = [
  {
    id: "1",
    title: "Rage bait: How online anger makes money",
    date: "2025-02-13",
    duration: "6分钟",
    imageUrl: "/static/images/240104.jpg",
    isPlaying: false,
  },
  {
    id: "2",
    title: "Why smells make us feel at home",
    date: "2025-02-06",
    duration: "6分钟",
    imageUrl: "/static/images/240111.jpg",
    isPlaying: false,
  },
  {
    id: "3",
    title: "Rage bait: How online anger makes money",
    date: "2025-02-13",
    duration: "6分钟",
    imageUrl: "/static/images/240118.jpg",
    isPlaying: false,
  },
  {
    id: "4",
    title: "Why smells make us feel at home",
    date: "2025-02-06",
    duration: "6分钟",
    imageUrl: "/static/images/240125.jpg",
    isPlaying: false,
  },
  {
    id: "5",
    title: "Rage bait: How online anger makes money",
    date: "2025-02-13",
    duration: "6分钟",
    imageUrl: "/static/images/240201.jpg",
    isPlaying: false,
  },
  {
    id: "6",
    title: "Why smells make us feel at home",
    date: "2025-02-06",
    duration: "6分钟",
    imageUrl: "/static/images/240208.jpg",
    isPlaying: false,
  },
  {
    id: "7",
    title: "Rage bait: How online anger makes money",
    date: "2025-02-13",
    duration: "6分钟",
    imageUrl: "/static/images/240215.jpg",
    isPlaying: false,
  },
  {
    id: "8",
    title: "Why smells make us feel at home",
    date: "2025-02-06",
    duration: "6分钟",
    imageUrl: "/static/images/240222.jpg",
    isPlaying: false,
  },
  {
    id: "9",
    title: "Rage bait: How online anger makes money",
    date: "2025-02-13",
    duration: "6分钟",
    imageUrl: "/static/images/240229.jpg",
    isPlaying: false,
  },
  {
    id: "10",
    title: "Why smells make us feel at home",
    date: "2025-02-06",
    duration: "6分钟",
    imageUrl: "/static/images/240307.jpg",
    isPlaying: false,
  },
  // 其他节目...
];

export default function Page() {
  return (
    <div className="pt-4 p-2">
      <ProgramList
        programTitle="6 Minute English"
        programPublisher="BBC Learning English"
        programCategory="语言学习"
        episodes={samplePrograms}
      />
    </div>
  );
}
