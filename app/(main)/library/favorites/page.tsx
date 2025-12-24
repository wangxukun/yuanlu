import { auth } from "@/auth";
import { favoritesService } from "@/core/favorites/favorites.service";
import FavoritesPage from "./FavoritesPage";
import { redirect } from "next/navigation";

export const metadata = {
  title: "我的收藏 | 远路",
};

export default async function Page() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  const userId = session.user.userid;

  // 并行获取数据，提升性能
  const [favoritePodcasts, favoriteEpisodes] = await Promise.all([
    favoritesService.getFavoriteSeries(userId),
    favoritesService.getFavoriteEpisodes(userId),
  ]);

  return (
    <FavoritesPage
      favoritePodcasts={favoritePodcasts}
      favoriteEpisodes={favoriteEpisodes}
    />
  );
}
