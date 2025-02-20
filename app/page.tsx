// 在你的页面组件中
import List from "@/components/list/List";
import Image from "next/image";

const sampleItems = [
  {
    id: "0000001",
    imageUrl: "/static/images/1.png",
    label: "NEWS",
    subtitle: "Apple News Today",
    source: "Apple News",
  },
  {
    id: "0000002",
    imageUrl: "/static/images/2.png",
    label: "ENGLISH",
    subtitle: "Learning Easy English",
    source: "BBC Learning English",
  },
  {
    id: "0000003",
    imageUrl: "/static/images/3.png",
    label: "NEWS",
    subtitle: "Apple News Today",
    source: "Apple News",
  },
  {
    id: "0000004",
    imageUrl: "/static/images/4.png",
    label: "ENGLISH",
    subtitle: "Learning Easy English",
    source: "BBC Learning English",
  },
  {
    id: "0000005",
    imageUrl: "/static/images/5.png",
    label: "NEWS",
    subtitle: "Apple News Today",
    source: "Apple News",
  },
  {
    id: "0000006",
    imageUrl: "/static/images/6.png",
    label: "ENGLISH",
    subtitle: "Learning Easy English",
    source: "BBC Learning English",
  },
  {
    id: "0000007",
    imageUrl: "/static/images/7.png",
    label: "NEWS",
    subtitle: "Apple News Today",
    source: "Apple News",
  },
  {
    id: "0000008",
    imageUrl: "/static/images/8.png",
    label: "ENGLISH",
    subtitle: "Learning Easy English",
    source: "BBC Learning English",
  },
  {
    id: "0000009",
    imageUrl: "/static/images/8.png",
    label: "ENGLISH",
    subtitle: "Learning Easy English",
    source: "BBC Learning English",
  },
];

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="row-start-1 flex gap-6 flex-wrap items-center justify-center">
        <Image
          src="/static/images/logo.png"
          alt="远路漫漫"
          width={80}
          height={80}
        />
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <List title="热门节目" items={sampleItems} />
        <List title="会员专享" items={sampleItems} />
        <List title="最近更新" items={sampleItems} />
        <List title="最近收听" items={sampleItems} />
      </main>
    </div>
  );
}
