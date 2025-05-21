// 在你的页面组件中
import List from "@/components/list/List";
import { fetchPodcasts } from "@/app/lib/fetchSubtitles";
import { Podcast } from "@/app/types/podcast";

export default async function Home() {
  let podcasts: Podcast[] = [];
  try {
    podcasts = await fetchPodcasts();
  } catch (error) {
    console.error("Failed to fetch podcasts:", error);
    // 可以选择返回空数组或者默认数据
    podcasts = [];
  }
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-(family-name:--font-geist-sans)">
      <main className="flex flex-col gap-8 row-start-2 items-center justify-items-center sm:items-start">
        <List title="最近更新" items={podcasts} />
      </main>
    </div>
  );
}
