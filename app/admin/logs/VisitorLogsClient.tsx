"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Activity,
  MapPin,
  Monitor,
  Smartphone,
  User as UserIcon,
  Globe,
  Link as LinkIcon,
  Clock,
  Database,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { deleteVisitorLog } from "@/lib/actions/log-actions";
import { toast } from "sonner";

// 定义与后端 Action 匹配的类型
interface VisitorLog {
  id: string;
  ip: string | null;
  path: string;
  userAgent: string | null;
  createAt: Date | string;
  User?: {
    email: string;
    user_profile: {
      nickname: string | null;
      avatarUrl: string | null;
      avatarFileName: string | null;
    } | null;
  } | null;
  location?: string | null;
  userid: string | null;
}
export default function VisitorLogsClient({
  initialLogs,
  total,
  totalPages,
  currentPage,
}: {
  initialLogs: VisitorLog[];
  total: number;
  totalPages: number;
  currentPage: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pathFilter, setPathFilter] = useState("ALL");

  // 设备图标解析
  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return <Monitor size={16} />;
    if (
      ua.includes("iPhone") ||
      ua.includes("Android") ||
      ua.includes("Mobile")
    )
      return <Smartphone size={16} />;
    return <Monitor size={16} />;
  };

  const getPlatform = (ua: string | null) => {
    if (!ua) return "未知系统";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Macintosh")) return "macOS";
    if (ua.includes("iPhone")) return "iOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("Linux")) return "Linux";
    return "其他设备";
  };

  const getBrowser = (ua: string | null) => {
    if (!ua) return "未知浏览器";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    return "Web Browser";
  };

  // 统计数据
  const stats = useMemo(() => {
    const uniqueIps = new Set(initialLogs.map((l) => l.ip)).size;
    const paths = initialLogs.reduce(
      (acc, log) => {
        acc[log.path] = (acc[log.path] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalCount: total,
      unique: uniqueIps,
      topPath:
        (Object.entries(paths) as [string, number][]).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "N/A",
    };
  }, [initialLogs, total]);

  // 客户端筛选逻辑
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      const nickname = log.User?.user_profile?.nickname || "游客";
      const matchesSearch =
        (log.ip || "").includes(searchQuery) ||
        (log.path || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        nickname.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPath =
        pathFilter === "ALL" || log.path.startsWith(pathFilter);
      return matchesSearch && matchesPath;
    });
  }, [initialLogs, searchQuery, pathFilter]);

  // ... 处理删除逻辑 ...
  const handleDelete = async (id: string) => {
    const res = await deleteVisitorLog(id);
    if (res.success) {
      toast.success("日志已删除");
    } else {
      toast.error(res.error || "操作失败");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 头部状态 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-content rounded-xl">
              <Activity size={24} />
            </div>
            全站访问日志
          </h1>
          <p className="text-base-content/60 mt-1 italic">
            监控实时系统访问与用户行为轨迹
          </p>
        </div>
        <div className="badge badge-outline border-base-300 gap-2 p-4 h-auto rounded-2xl bg-base-100 shadow-sm">
          <Database size={16} className="text-success" />
          <span className="text-sm font-bold">
            存储状态: <span className="text-success">正常运行</span>
          </span>
        </div>
      </div>

      {/* 数据看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body flex-row items-center justify-between p-6">
            <div>
              <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
                总访问量
              </p>
              <p className="text-3xl font-black mt-1">{stats.totalCount}</p>
            </div>
            <div className="p-4 bg-primary/10 text-primary rounded-2xl">
              <Globe size={24} />
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body flex-row items-center justify-between p-6">
            <div>
              <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
                独立 IP (当前页)
              </p>
              <p className="text-3xl font-black mt-1">{stats.unique}</p>
            </div>
            <div className="p-4 bg-secondary/10 text-secondary rounded-2xl">
              <MapPin size={24} />
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body flex-row items-center justify-between p-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
                高频端点
              </p>
              <p className="text-lg font-bold mt-1 truncate">{stats.topPath}</p>
            </div>
            <div className="p-4 bg-accent/10 text-accent rounded-2xl">
              <LinkIcon size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 搜索与过滤栏 */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body p-4 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
            />
            <input
              type="text"
              placeholder="搜索 IP、用户昵称或访问路径..."
              className="input input-bordered w-full pl-12 rounded-2xl bg-base-200/50 focus:bg-base-100 transition-all border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {["ALL", "/podcast", "/episode", "/series", "/vocabulary"].map(
              (path) => (
                <button
                  key={path}
                  onClick={() => setPathFilter(path)}
                  className={`btn btn-sm rounded-xl font-bold whitespace-nowrap ${
                    pathFilter === path
                      ? "btn-neutral shadow-md"
                      : "btn-ghost border-base-300"
                  }`}
                >
                  {path}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      <div className="card bg-base-100 border border-base-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200/50 text-xs font-bold opacity-60 uppercase tracking-widest">
                <th className="px-6 py-4">时间</th>
                <th className="px-6 py-4">访客详情</th>
                <th className="px-6 py-4">请求路径</th>
                <th className="px-6 py-4">位置</th>
                <th className="px-6 py-4">设备环境</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200">
              {filteredLogs.map((log) => {
                const user = log.User;
                const profile = user?.user_profile;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-base-200/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-[11px] opacity-70">
                        <Clock size={12} />
                        {format(new Date(log.createAt), "MM-dd HH:mm:ss", {
                          locale: zhCN,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user ? (
                          <>
                            <div className="avatar">
                              <div className="w-9 h-9 rounded-full">
                                <Image
                                  src={
                                    profile?.avatarUrl &&
                                    profile.avatarUrl !== "default_avatar_url"
                                      ? profile.avatarUrl
                                      : "/static/images/default-avatar.png"
                                  }
                                  alt="avatar"
                                  width={36}
                                  height={36}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-black text-sm">
                                {profile?.nickname || user.email.split("@")[0]}
                              </div>
                              <div className="text-[10px] opacity-50 font-mono">
                                {log.ip}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-9 h-9 rounded-full bg-base-200 flex items-center justify-center opacity-50">
                              <UserIcon size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-bold opacity-40 italic">
                                游客访问
                              </div>
                              <div className="text-[10px] opacity-50 font-mono">
                                {log.ip}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 max-w-[200px] truncate block">
                        {log.path}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {log.location || "未知"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-base-200 rounded-xl opacity-70">
                          {getDeviceIcon(log.userAgent)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">
                            {getPlatform(log.userAgent)}
                          </span>
                          <span className="text-[10px] opacity-50">
                            {getBrowser(log.userAgent)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight size={16} />
                      </button>
                      {/* 新增：删除按钮 */}
                      <button
                        onClick={() => {
                          if (confirm("确定要永久删除这条访问记录吗？")) {
                            handleDelete(log.id);
                          }
                        }}
                        className="btn btn-ghost btn-xs btn-circle text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页控制器 */}
        <div className="bg-base-200/30 px-6 py-4 flex items-center justify-between border-t border-base-200">
          <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
            显示{" "}
            <span className="text-base-content font-black">
              {filteredLogs.length}
            </span>{" "}
            / {total} 条记录
          </p>
          <div className="join shadow-sm">
            <Link
              href={`/admin/logs?page=${currentPage - 1}`}
              className={`join-item btn btn-sm bg-base-100 ${currentPage <= 1 ? "btn-disabled" : ""}`}
            >
              上一页
            </Link>
            <button className="join-item btn btn-sm bg-base-100 no-animation">
              {currentPage} / {totalPages}
            </button>
            <Link
              href={`/admin/logs?page=${currentPage + 1}`}
              className={`join-item btn btn-sm bg-base-100 ${currentPage >= totalPages ? "btn-disabled" : ""}`}
            >
              下一页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
