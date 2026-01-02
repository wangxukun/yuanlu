import { getVisitorLogs } from "@/lib/actions/log-actions";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import Image from "next/image";
import { UserCircle, Monitor, Smartphone, Globe } from "lucide-react";

// 简单的 UserAgent 解析辅助函数
const getDeviceIcon = (ua: string | null) => {
  if (!ua) return <Globe size={16} className="text-gray-400" />;
  if (
    ua.includes("Mobile") ||
    ua.includes("Android") ||
    ua.includes("iPhone")
  ) {
    return <Smartphone size={16} className="text-purple-500" />;
  }
  return <Monitor size={16} className="text-blue-500" />;
};

export default async function AccessLogsPage(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const { logs, total, totalPages } = await getVisitorLogs(currentPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">全站访问日志</h1>
          <p className="text-base-content/60 text-sm mt-1">
            共记录 {total} 条访问数据 (包含游客与登录用户)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-lg shadow border border-base-200">
        <table className="table table-zebra w-full">
          <thead className="bg-base-200">
            <tr>
              <th>访客类型</th>
              <th>IP 地址</th>
              <th>访问路径</th>
              <th>设备类型</th>
              <th>访问时间</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              // 提取用户信息逻辑，处理空值
              const user = log.User;
              const profile = user?.user_profile;
              const nickname = profile?.nickname || "未命名用户";
              const avatarUrl = profile?.avatarUrl;

              return (
                <tr key={log.id} className="hover">
                  <td>
                    <div className="flex items-center gap-3">
                      {user ? (
                        <>
                          <div className="avatar">
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              {avatarUrl &&
                              avatarUrl !== "default_avatar_url" ? (
                                <Image
                                  src={avatarUrl}
                                  alt={nickname}
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              ) : (
                                <UserCircle className="w-full h-full text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-xs">{nickname}</div>
                            <div className="text-[10px] opacity-50">
                              {user.email}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="badge badge-ghost badge-sm gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                          游客
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-xs">{log.ip}</td>
                  <td>
                    <div
                      className="badge badge-outline text-xs truncate max-w-[200px]"
                      title={log.path}
                    >
                      {log.path}
                    </div>
                  </td>
                  <td>
                    <div
                      className="flex items-center gap-2 text-xs"
                      title={log.userAgent || ""}
                    >
                      {getDeviceIcon(log.userAgent)}
                      <span className="truncate max-w-[150px] opacity-70">
                        {log.userAgent?.substring(0, 20)}...
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-base-content/70">
                    {format(new Date(log.createAt), "yyyy-MM-dd HH:mm:ss", {
                      locale: zhCN,
                    })}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-base-content/50"
                >
                  暂无访问记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      <div className="join flex justify-center mt-4">
        <a
          href={`/admin/logs?page=${currentPage - 1}`}
          className={`join-item btn btn-sm ${currentPage <= 1 ? "btn-disabled" : ""}`}
        >
          « 上一页
        </a>
        <button className="join-item btn btn-sm btn-active">
          第 {currentPage} 页 / 共 {totalPages} 页
        </button>
        <a
          href={`/admin/logs?page=${currentPage + 1}`}
          className={`join-item btn btn-sm ${currentPage >= totalPages ? "btn-disabled" : ""}`}
        >
          下一页 »
        </a>
      </div>
    </div>
  );
}
