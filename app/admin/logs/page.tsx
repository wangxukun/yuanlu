import { getVisitorLogs } from "@/lib/actions/log-actions";
import VisitorLogsClient from "./VisitorLogsClient";

export default async function AccessLogsPage(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;

  // 获取数据 (由 Server Action 处理权限校验和 OSS 签名)
  const { logs, total, totalPages } = await getVisitorLogs(currentPage, 20);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-base-200/20">
      <VisitorLogsClient
        initialLogs={logs}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
      />
    </div>
  );
}
