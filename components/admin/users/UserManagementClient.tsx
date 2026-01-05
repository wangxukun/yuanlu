"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Shield,
  UserX,
  CheckCircle,
  Clock,
  Mail,
  Edit3,
  Trash2,
  Ban,
  UserCheck,
} from "lucide-react";
import { User } from "@/core/user/user.entity";

// 修复：在 Omit 中排除 'isCommentAllowed' 和 'userProfile'，以便我们可以重新定义它们的类型而不冲突
interface ExtendedUser
  extends Omit<
    User,
    | "createAt"
    | "updateAt"
    | "lastActiveAt"
    | "emailVerified"
    | "isCommentAllowed"
    | "userProfile"
  > {
  createAt: string;
  updateAt: string;
  lastActiveAt: string | null;
  emailVerified: string | null;
  isCommentAllowed: boolean; // 我们在 page.tsx 中提供了默认值，所以这里是 boolean
  userProfile?: {
    nickname: string | null;
    avatarFileName: string | null;
    learnLevel: string | null;
    dailyStudyGoalMins?: number | null;
  } | null;
}

interface UserManagementClientProps {
  initialUsers: ExtendedUser[];
}

export default function UserManagementClient({
  initialUsers,
}: UserManagementClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<ExtendedUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ONLINE" | "OFFLINE"
  >("ALL");

  // 统计数据计算
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    return {
      total: users.length,
      activeToday: users.filter((u) => {
        if (!u.lastActiveAt) return false;
        return new Date(u.lastActiveAt).toDateString() === todayStr;
      }).length,
      banned: users.filter((u) => u.isCommentAllowed === false).length,
    };
  }, [users]);

  // 筛选逻辑
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const nickname = user.userProfile?.nickname || "";
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nickname.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ONLINE" ? user.isOnline : !user.isOnline);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // 处理封禁/解封
  const handleToggleBan = async (userid: string, currentStatus: boolean) => {
    // 乐观更新
    setUsers((prev) =>
      prev.map((u) =>
        u.userid === userid ? { ...u, isCommentAllowed: !currentStatus } : u,
      ),
    );

    try {
      // TODO: 替换为真实的 Server Action 调用
      // await toggleUserBanAction(userid);
      console.log(`Toggling ban for user ${userid}`);
    } catch (error) {
      // 回滚
      setUsers((prev) =>
        prev.map((u) =>
          u.userid === userid ? { ...u, isCommentAllowed: currentStatus } : u,
        ),
      );
      console.error("Failed to toggle ban", error);
    }
  };

  // 处理删除
  const handleDelete = async (userid: string) => {
    if (
      !confirm("确定要删除此用户吗？此操作无法撤销，并将删除所有相关资料。")
    ) {
      return;
    }

    try {
      // 调用 API 删除
      const res = await fetch(`/api/user/delete?id=${userid}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.userid !== userid));
        router.refresh(); // 刷新服务端数据
      } else {
        alert("删除失败");
      }
    } catch (error) {
      console.error("删除出错", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "从未";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full space-y-6 p-2 md:p-6 font-sans">
      {/* 头部区域 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content">用户管理</h1>
          <p className="text-base-content/60 mt-1">
            管理用户账户、角色及权限设置。
          </p>
        </div>
        <button className="btn btn-primary shadow-lg shadow-primary/20 gap-2">
          <Mail size={18} />
          邀请用户
        </button>
      </div>

      {/* 统计卡片 (DaisyUI Stats) */}
      <div className="stats shadow w-full bg-base-100 grid-flow-row md:grid-flow-col">
        <div className="stat">
          <div className="stat-figure text-primary bg-primary/10 p-3 rounded-xl">
            <Users size={24} />
          </div>
          <div className="stat-title">总用户数</div>
          <div className="stat-value text-primary">{stats.total}</div>
          <div className="stat-desc">注册用户总计</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary bg-secondary/10 p-3 rounded-xl">
            <Clock size={24} />
          </div>
          <div className="stat-title">今日活跃</div>
          <div className="stat-value text-secondary">{stats.activeToday}</div>
          <div className="stat-desc">24小时内活动用户</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-error bg-error/10 p-3 rounded-xl">
            <UserX size={24} />
          </div>
          <div className="stat-title">受限用户</div>
          <div className="stat-value text-error">{stats.banned}</div>
          <div className="stat-desc">评论权限被封禁</div>
        </div>
      </div>

      {/* 筛选与搜索工具栏 */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4 flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
            />
            <input
              type="text"
              placeholder="搜索用户姓名或邮箱..."
              className="input input-bordered w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <select
              className="select select-bordered"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "ALL" | "USER" | "ADMIN")
              }
            >
              <option value="ALL">所有角色</option>
              <option value="ADMIN">管理员</option>
              <option value="USER">普通用户</option>
            </select>
            <select
              className="select select-bordered"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | "ONLINE" | "OFFLINE")
              }
            >
              <option value="ALL">所有状态</option>
              <option value="ONLINE">在线</option>
              <option value="OFFLINE">离线</option>
            </select>
          </div>
        </div>
      </div>

      {/* 用户数据表格 */}
      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            {/* 表头 */}
            <thead>
              <tr className="bg-base-200/50 text-base-content/70">
                <th className="px-6 py-4">用户</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">学习进度</th>
                <th className="px-6 py-4">验证状态</th>
                <th className="px-6 py-4">最后活动</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.userid} className="hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar indicator">
                          {user.isOnline && (
                            <span className="indicator-item badge badge-success badge-xs ring ring-white ring-offset-base-100"></span>
                          )}
                          <div className="w-10 h-10 rounded-full mask mask-squircle">
                            <img
                              src={
                                user.userProfile?.avatarFileName
                                  ? `https://yuanlu-files.oss-cn-hangzhou.aliyuncs.com/${user.userProfile.avatarFileName}` // 假设 OSS URL 模式
                                  : `https://ui-avatars.com/api/?name=${user.email}&background=random`
                              }
                              alt={user.userProfile?.nickname || "User"}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {user.userProfile?.nickname || "未设置昵称"}
                            {user.isCommentAllowed === false && (
                              <span className="badge badge-error badge-xs font-bold">
                                BANNED
                              </span>
                            )}
                          </div>
                          <div className="text-xs opacity-50">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === "ADMIN" ? (
                        <div className="badge badge-primary gap-1 badge-sm">
                          <Shield size={12} /> 管理员
                        </div>
                      ) : (
                        <div className="badge badge-ghost badge-sm">用户</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {user.userProfile?.learnLevel || "Beginner"}
                        </span>
                        <span className="text-xs opacity-50">
                          目标: {user.userProfile?.dailyStudyGoalMins || 30}{" "}
                          分钟/天
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.emailVerified ? (
                        <div className="flex items-center text-success text-xs font-medium gap-1">
                          <CheckCircle size={14} /> 已验证
                        </div>
                      ) : (
                        <div className="flex items-center text-warning text-xs font-medium gap-1">
                          <Clock size={14} /> 待验证
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {user.lastActiveAt ? (
                          <>{formatDate(user.lastActiveAt)}</>
                        ) : (
                          <span className="opacity-50">从未</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="join">
                        <button
                          className={`btn btn-square btn-sm join-item ${
                            user.isCommentAllowed === false
                              ? "btn-error btn-outline"
                              : "btn-ghost text-error"
                          }`}
                          onClick={() =>
                            handleToggleBan(
                              user.userid,
                              user.isCommentAllowed ?? true,
                            )
                          }
                          title={
                            user.isCommentAllowed === false
                              ? "解封用户"
                              : "封禁用户"
                          }
                        >
                          {user.isCommentAllowed === false ? (
                            <UserCheck size={16} />
                          ) : (
                            <Ban size={16} />
                          )}
                        </button>
                        <button
                          className="btn btn-square btn-ghost btn-sm join-item hover:text-primary"
                          title="编辑用户"
                          onClick={() =>
                            router.push(`/admin/users/${user.userid}/edit`)
                          }
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn btn-square btn-ghost btn-sm join-item hover:text-primary"
                          title="权限设置"
                          onClick={() =>
                            router.push(`/admin/users/${user.userid}/setting`)
                          }
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          className="btn btn-square btn-ghost btn-sm join-item hover:text-error"
                          title="删除用户"
                          onClick={() => handleDelete(user.userid)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-base-content/50"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Users size={48} className="text-base-200" />
                      <p>未找到符合条件的用户</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页占位符 */}
        <div className="bg-base-100 px-6 py-4 border-t border-base-200 flex items-center justify-between">
          <span className="text-xs text-base-content/60">
            显示{" "}
            <span className="font-bold">
              {filteredUsers.length > 0 ? 1 : 0}
            </span>{" "}
            到{" "}
            <span className="font-bold">
              {Math.min(filteredUsers.length, 10)}
            </span>{" "}
            条，共 <span className="font-bold">{filteredUsers.length}</span>{" "}
            条结果
          </span>
          <div className="join">
            <button className="join-item btn btn-sm btn-outline btn-disabled">
              上一页
            </button>
            <button className="join-item btn btn-sm btn-outline hover:bg-base-200">
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
