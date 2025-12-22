import { auth } from "@/auth";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import ListeningHistoryPage from "./ListeningHistoryPage";
import { redirect } from "next/navigation";

export const metadata = {
  title: "收听历史 | 远路",
};

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  // 服务端获取数据
  const history = await listeningHistoryService.getUserHistory(
    session.user.userid,
  );

  return <ListeningHistoryPage history={history} />;
}
