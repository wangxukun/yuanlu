// 在你的页面组件中
import List from "@/components/list/List";
import { fetchPodcasts } from "@/app/lib/data";

export default async function Home() {
  const podcasts = await fetchPodcasts();
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center justify-items-center sm:items-start">
        <List title="热门节目" items={podcasts} />
        <List title="会员专享" items={podcasts} />
        <List title="最近更新" items={podcasts} />
        <List title="最近收听" items={podcasts} />
      </main>
    </div>
  );
}
