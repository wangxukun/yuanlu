// 在你的页面组件中
import List from "@/components/list/List";

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
    <div className="flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center justify-items-center sm:items-start">
        <List title="热门节目" items={sampleItems} />
        <List title="会员专享" items={sampleItems} />
        <List title="最近更新" items={sampleItems} />
        <List title="最近收听" items={sampleItems} />
      </main>
    </div>
  );
}
