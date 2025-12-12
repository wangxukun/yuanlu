"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserCircleIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";

// 定义评论数据结构 (对应 Prisma 查询返回的结构)
interface CommentUser {
  userid: string;
  email: string;
  user_profile: {
    nickname: string | null;
    avatarUrl: string | null;
  } | null;
}

interface Comment {
  commentid: number;
  userid: string | null;
  episodeid: string | null;
  commentText: string | null;
  commentAt: string; // JSON 返回的是 ISO 字符串
  User: CommentUser | null;
}

export default function EpisodeComments({ episodeId }: { episodeId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 获取评论列表
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/comment/list?episodeid=${episodeId}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (error) {
        console.error("Failed to load comments", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (episodeId) {
      fetchComments();
    }
  }, [episodeId]);

  // 2. 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !session) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/comment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeid: episodeId,
          content: commentContent,
        }),
      });

      if (res.ok) {
        const newComment: Comment = await res.json();
        // 乐观更新：直接将新评论加到列表头部
        setComments((prev) => [newComment, ...prev]);
        setCommentContent(""); // 清空输入框
      } else {
        alert("评论发布失败，请稍后重试");
      }
    } catch (error) {
      console.error("Submit error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 辅助函数：格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // 辅助函数：获取显示名称
  const getDisplayName = (user: CommentUser | null) => {
    if (!user) return "未知用户";
    return user.user_profile?.nickname || user.email?.split("@")[0] || "用户";
  };

  return (
    <div className="mt-12 border-t border-base-200 pt-8">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span>💬</span> 听友评论 ({comments.length})
      </h3>

      {/* 评论输入框区域 */}
      {session ? (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-4 items-start">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-10">
              {session.user?.image ? (
                <img src={session.user.image} alt="avatar" />
              ) : (
                <span className="text-xs">Me</span>
              )}
            </div>
          </div>
          <div className="flex-1 relative">
            <textarea
              className="textarea textarea-bordered w-full h-24 focus:border-primary resize-none"
              placeholder="写下你的听课心得..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              disabled={isSubmitting}
            ></textarea>
            <button
              type="submit"
              className="btn btn-sm btn-primary absolute bottom-3 right-3 rounded-lg"
              disabled={!commentContent.trim() || isSubmitting}
            >
              {isSubmitting ? (
                "发布中..."
              ) : (
                <>
                  发布 <PaperAirplaneIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-6 bg-base-200/50 rounded-xl text-center border border-dashed border-base-300">
          <p className="text-base-content/60 mb-2">登录后即可参与讨论</p>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => {
              // 触发你全局的登录弹窗，或者跳转登录页
              const modal = document.getElementById(
                "email_check_modal_box",
              ) as HTMLDialogElement;
              if (modal) modal.showModal();
            }}
          >
            点击登录
          </button>
        </div>
      )}

      {/* 评论列表 */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-10 text-base-content/40">
            加载评论中...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 text-base-content/40">
            暂无评论，快来抢沙发！
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.commentid} className="flex gap-4 group">
              <div className="avatar placeholder pt-1">
                <div className="bg-base-200 text-base-content/50 rounded-full w-10 h-10 overflow-hidden">
                  {c.User?.user_profile?.avatarUrl &&
                  c.User.user_profile.avatarUrl !== "default_avatar_url" ? (
                    <img
                      src={c.User.user_profile.avatarUrl}
                      alt="avatar"
                      className="object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-full h-full" />
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-base-content">
                    {getDisplayName(c.User)}
                  </span>
                  <span className="text-xs text-base-content/40 font-mono">
                    {formatDate(c.commentAt)}
                  </span>
                </div>
                <p className="text-base-content/80 text-sm leading-relaxed bg-base-200/30 p-3 rounded-r-xl rounded-bl-xl group-hover:bg-base-200/60 transition-colors whitespace-pre-wrap">
                  {c.commentText}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
