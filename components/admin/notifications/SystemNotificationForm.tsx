"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

export default function SystemNotificationForm() {
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [userIdsInput, setUserIdsInput] = useState("");
  const [message, setMessage] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error("通知内容不能为空");
      return;
    }

    let parsedUserIds: string[] = [];
    if (targetType === "specific") {
      parsedUserIds = userIdsInput
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (parsedUserIds.length === 0) {
        toast.error("请输入至少一个用户ID");
        return;
      }
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/notification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          userIds: parsedUserIds,
          message,
          targetUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "发送失败");
      }

      toast.success(data.message || "通知发送成功");
      // 重置表单
      setMessage("");
      setTargetUrl("");
      if (targetType === "specific") {
        setUserIdsInput("");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "发生未知错误";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl mx-auto">
      <div className="px-8 py-6 border-b border-gray-50">
        <h2 className="text-xl font-bold text-gray-900">发送系统通知</h2>
        <p className="text-sm text-gray-500 mt-1">
          在此向全站用户或特定对象发送广播消息或系统提醒
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* 目标选择 */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-500 uppercase block">
            发送对象 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="targetType"
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-600 border-gray-300"
                checked={targetType === "all"}
                onChange={() => setTargetType("all")}
              />
              <span className="text-sm font-medium text-gray-700">
                所有人 (全站广播)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="targetType"
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-600 border-gray-300"
                checked={targetType === "specific"}
                onChange={() => setTargetType("specific")}
              />
              <span className="text-sm font-medium text-gray-700">
                指定用户
              </span>
            </label>
          </div>
        </div>

        {/* 指定用户输入框 */}
        {targetType === "specific" && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
            <label className="flex justify-between items-baseline">
              <span className="text-xs font-bold text-gray-500 uppercase">
                指定用户 IDs
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                使用英文逗号分隔
              </span>
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300 font-mono text-sm"
              placeholder="例如: clx9u1..., clx9u2..."
              value={userIdsInput}
              onChange={(e) => setUserIdsInput(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {/* 通知内容 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase block">
            通知内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-gray-300"
            placeholder="请输入系统公告、版本更新提示或活动通知内容..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
          />
        </div>

        {/* 目标链接 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase block">
            目标跳转链接 (选填)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
            placeholder="例如: /episode/123 或 https://example.com"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
        </div>

        {/* 底部按钮栏 */}
        <div className="pt-6 border-t border-gray-50 flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm mr-2"></span>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45 mr-2" />
            )}
            立即发送
          </button>
        </div>
      </form>
    </div>
  );
}
