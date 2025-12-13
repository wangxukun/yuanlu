"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";

// 接口定义保持不变...
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

  // 获取评论逻辑保持不变...
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

  // 提交逻辑保持不变...
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
    // 容器样式与 EpisodeDocument 统一
    <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-base-200 flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-bold">
          听友讨论{" "}
          <span className="text-base-content/40 text-sm font-normal ml-1">
            {comments.length} 条
          </span>
        </h3>
      </div>

      <div className="p-6 md:p-8">
        {/* 输入框 */}
        {session ? (
          <form
            onSubmit={handleSubmit}
            className="mb-10 flex gap-4 items-start"
          >
            <div className="avatar placeholder pt-1">
              <div className="bg-primary/10 text-primary rounded-full w-10 md:w-12">
                {session.user?.image ? (
                  <img src={session.user.image} alt="me" />
                ) : (
                  <span className="text-sm font-bold">Me</span>
                )}
              </div>
            </div>
            <div className="flex-1 relative group">
              <textarea
                className="textarea textarea-bordered w-full h-32 focus:border-primary resize-none text-base p-4 bg-base-200/30 focus:bg-base-100 transition-colors"
                placeholder="分享你的学习心得或疑问..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmitting}
              ></textarea>
              <button
                type="submit"
                className="btn btn-sm btn-primary absolute bottom-4 right-4 rounded-lg shadow-md transition-all hover:scale-105"
                disabled={!commentContent.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  "发布..."
                ) : (
                  <>
                    发布 <PaperAirplaneIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-10 p-8 bg-base-200/30 rounded-2xl border border-dashed border-base-300 text-center flex flex-col items-center gap-3">
            <p className="text-base-content/60 font-medium">
              登录后参与讨论，记录你的学习点滴
            </p>
            <button
              className="btn btn-primary btn-sm px-6"
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
        )}

        {/* 列表 */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-base-content/40 italic">
              暂无评论，来坐沙发！
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.commentid}
                className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                <div className="avatar placeholder pt-1">
                  <div className="bg-base-200 text-base-content/40 rounded-full w-10 h-10 md:w-12 md:h-12 overflow-hidden shadow-sm">
                    {c.User?.user_profile?.avatarUrl ? (
                      <img src={c.User.user_profile.avatarUrl} alt="av" />
                    ) : (
                      <UserCircleIcon className="w-full h-full" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-bold text-sm md:text-base text-base-content/90">
                      {getDisplayName(c.User)}
                    </span>
                    <span className="text-xs text-base-content/40">
                      {formatDate(c.commentAt)}
                    </span>
                  </div>
                  <div className="bg-base-200/40 p-3 md:p-4 rounded-2xl rounded-tl-none hover:bg-base-200/70 transition-colors text-sm md:text-base leading-relaxed text-base-content/80 whitespace-pre-wrap">
                    {c.commentText}
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
