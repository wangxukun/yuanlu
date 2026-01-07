"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import clsx from "clsx";

// 接口定义保持不变
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
  commentAt: string;
  User: CommentUser | null;
}

export default function EpisodeComments({ episodeId }: { episodeId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取评论
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
    if (episodeId) fetchComments();
  }, [episodeId]);

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !session) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/comment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeid: episodeId, content: commentContent }),
      });
      if (res.ok) {
        const newComment: Comment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setCommentContent("");
      } else {
        alert("发布失败");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDisplayName = (user: CommentUser | null) =>
    user?.user_profile?.nickname || user?.email?.split("@")[0] || "用户";

  return (
    // 外层容器：与 EpisodeDocument 风格对齐，使用大圆角和柔和阴影
    <div className="bg-base-100 rounded-[1.5rem] md:rounded-[2rem] shadow-sm ring-1 ring-base-200/50 overflow-hidden">
      {/* Header: 极简风格 */}
      <div className="px-6 md:px-10 py-6 border-b border-base-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-base-content/90">听友讨论</h3>
          <p className="text-xs text-base-content/40 font-medium">
            Community Discussion • {comments.length}
          </p>
        </div>
      </div>

      <div className="p-4 md:p-8 lg:p-10">
        {/* --- 输入区域 (Input Area) --- */}
        {session ? (
          <form
            onSubmit={handleSubmit}
            className="mb-12 flex gap-4 md:gap-6 items-start group"
          >
            {/* 当前用户头像 */}
            <div className="avatar placeholder pt-1 shrink-0">
              <div className="bg-primary/10 text-primary rounded-full w-10 h-10 md:w-12 md:h-12 ring-2 ring-base-100 shadow-sm">
                {session.user?.image ? (
                  <img src={session.user.image} alt="me" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-sm font-bold">
                    我
                  </span>
                )}
              </div>
            </div>

            {/* 文本框容器 */}
            <div className="flex-1 relative">
              <textarea
                className="textarea w-full h-32 text-base p-4 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-2xl resize-none shadow-inner placeholder:text-base-content/30 border-transparent focus:outline-none"
                placeholder="分享你的见解或疑问..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmitting}
              ></textarea>

              {/* 底部工具栏 (字数 & 按钮) */}
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span
                  className={clsx(
                    "text-xs transition-opacity font-mono text-base-content/30",
                    commentContent.length > 0 ? "opacity-100" : "opacity-0",
                  )}
                >
                  {commentContent.length}
                </span>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary rounded-xl shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95 disabled:bg-base-200 disabled:text-base-content/20 border-none"
                  disabled={!commentContent.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-3.5 h-3.5" /> 发布
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          // 未登录提示卡片
          <div className="mb-12 p-8 md:p-12 bg-base-200/30 rounded-3xl border border-dashed border-base-300 text-center">
            <div className="max-w-md mx-auto flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-base-200 rounded-full flex items-center justify-center text-base-content/30">
                <UserCircleIcon className="w-8 h-8" />
              </div>
              <p className="text-base-content/60 font-medium">
                登录后参与讨论，记录你的学习点滴
              </p>
              <button
                className="btn btn-primary btn-sm px-8 rounded-full shadow-lg shadow-primary/20"
                onClick={() => {
                  const modal = document.getElementById(
                    "email_check_modal_box",
                  ) as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
              >
                立即登录
              </button>
            </div>
          </div>
        )}

        {/* --- 评论列表 (Comments List) --- */}
        <div className="space-y-6 md:space-y-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-dots loading-lg text-primary/40"></span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 rounded-full bg-base-200/50 mb-3 text-base-content/20">
                <ChatBubbleLeftRightIcon className="w-8 h-8" />
              </div>
              <p className="text-base-content/40 italic">
                还没有人发言，来抢沙发吧！
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.commentid}
                className="flex gap-4 md:gap-6 group animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {/* 评论者头像 */}
                <div className="shrink-0">
                  <div className="avatar placeholder">
                    <div className="bg-base-200 text-base-content/30 rounded-full w-10 h-10 md:w-12 md:h-12 ring-2 ring-base-100 shadow-sm overflow-hidden">
                      {c.User?.user_profile?.avatarUrl ? (
                        <img src={c.User.user_profile.avatarUrl} alt="av" />
                      ) : (
                        <UserCircleIcon className="w-full h-full p-1" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 评论内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-bold text-sm text-slate-700">
                      {getDisplayName(c.User)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatDate(c.commentAt)}
                    </span>
                  </div>

                  {/* 内容气泡：左上角直角，其余圆角，模拟对话感 */}
                  <div className="bg-base-200 p-4 md:p-5 rounded-2xl rounded-tl-none text-slate-600 text-sm md:text-base leading-relaxed hover:bg-base-200/60 transition-colors">
                    <p className="whitespace-pre-wrap break-words">
                      {c.commentText}
                    </p>
                  </div>

                  {/* 底部微交互 (Reply/Like 预留) */}
                  <div className="flex gap-4 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button className="text-xs font-medium text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
                      回复
                    </button>
                    <button className="text-xs font-medium text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
                      点赞
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
