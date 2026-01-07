"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon as HeartIconOutline,
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import clsx from "clsx";

// --- Types ---
interface CommentUser {
  userid: string;
  email: string;
  user_profile: {
    nickname: string | null;
    avatarUrl: string | null;
    learnLevel?: string | null; // Added based on your context
  } | null;
}

interface Comment {
  commentid: number;
  userid: string | null;
  episodeid: string | null;
  commentText: string | null;
  commentAt: string;
  User: CommentUser | null;
  // New fields for extended functionality
  parentId?: number | null;
  likesCount?: number;
  isLiked?: boolean;
  replies?: Comment[];
}

export default function EpisodeComments({ episodeId }: { episodeId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply State
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // --- Fetch Data ---
  useEffect(() => {
    const fetchComments = async () => {
      try {
        // Assume API is updated to return nested structure or we handle flattening here.
        // For now, we'll assume the API returns a list and we might need to nest them manually
        // if the backend doesn't do it, but for this component code, we assume data comes in correct shape.
        const res = await fetch(`/api/comment/list?episodeid=${episodeId}`);
        if (res.ok) {
          const data = await res.json();
          // Note: If backend returns flat list, you might need a `buildTree` function here.
          // Assuming backend now handles nested `replies` based on Prisma schema.
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

  // --- Actions ---

  // Post a top-level comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !session) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/comment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeid: episodeId, content: commentContent }), // parentId is null
      });

      if (res.ok) {
        const newComment: Comment = await res.json();
        // Optimistically add to top of list
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

  // Post a reply
  const handleReplySubmit = async (parentId: number) => {
    if (!replyContent.trim() || !session) return;

    // Optimistic Update can be tricky with IDs, so we'll wait for server for creation
    // But we can show a loading state if needed.
    try {
      const res = await fetch("/api/comment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeid: episodeId,
          content: replyContent,
          parentId: parentId,
        }),
      });

      if (res.ok) {
        const newReply: Comment = await res.json();

        // Helper to recursively add reply
        const addReplyToTree = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.commentid === parentId) {
              return { ...c, replies: [...(c.replies || []), newReply] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: addReplyToTree(c.replies) };
            }
            return c;
          });
        };

        setComments((prev) => addReplyToTree(prev));
        setReplyContent("");
        setReplyingToId(null);
      }
    } catch (error) {
      console.error("Reply failed", error);
    }
  };

  // Toggle Like (Optimistic)
  const toggleLike = async (commentId: number) => {
    if (!session) {
      // Prompt login
      const modal = document.getElementById(
        "email_check_modal_box",
      ) as HTMLDialogElement;
      if (modal) modal.showModal();
      return;
    }

    // 1. Optimistic UI Update
    setComments((prevComments) => {
      const updateList = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.commentid === commentId) {
            const isLikedNow = !c.isLiked;
            return {
              ...c,
              isLiked: isLikedNow,
              likesCount: (c.likesCount || 0) + (isLikedNow ? 1 : -1),
            };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateList(c.replies) };
          }
          return c;
        });
      };
      return updateList(prevComments);
    });

    // 2. Server Request (Fire and forget, or handle revert on error)
    // You would need an endpoint like /api/comment/like
    try {
      await fetch("/api/comment/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
    } catch (error) {
      console.error("Like failed", error);
      // TODO: Revert optimistic update here if needed
    }
  };

  // --- Utility ---
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

  // --- Sub-component for recursive rendering ---
  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const isReplying = replyingToId === comment.commentid;

    return (
      <div
        className={clsx(
          "flex gap-3 md:gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500",
          isReply ? "mt-4" : "mt-6",
        )}
      >
        {/* Avatar */}
        <div className="shrink-0">
          <div
            className={clsx(
              "avatar placeholder rounded-full overflow-hidden shadow-sm ring-1 ring-base-200",
              isReply ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12",
            )}
          >
            {comment.User?.user_profile?.avatarUrl ? (
              <img
                src={comment.User.user_profile.avatarUrl}
                alt="av"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="bg-base-200 text-base-content/30 w-full h-full flex items-center justify-center">
                <UserCircleIcon className="w-2/3 h-2/3" />
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Metadata */}
          <div className="flex justify-between items-baseline mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "font-bold text-base-content/90",
                  isReply ? "text-xs md:text-sm" : "text-sm md:text-base",
                )}
              >
                {getDisplayName(comment.User)}
              </span>
              {comment.User?.user_profile?.learnLevel && !isReply && (
                <span className="badge badge-xs badge-primary badge-outline font-mono opacity-80">
                  {comment.User.user_profile.learnLevel}
                </span>
              )}
            </div>
            <span className="text-[10px] md:text-xs text-base-content/40 font-mono">
              {formatDate(comment.commentAt)}
            </span>
          </div>

          {/* Comment Bubble */}
          <div
            className={clsx(
              "bg-base-200/40 p-3 md:p-4 rounded-2xl rounded-tl-none text-base-content/80 leading-relaxed hover:bg-base-200/60 transition-colors",
              isReply ? "text-xs md:text-sm" : "text-sm md:text-base",
            )}
          >
            <p className="whitespace-pre-wrap break-words">
              {comment.commentText}
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-5 mt-2 ml-1">
            {/* Like Button */}
            <button
              onClick={() => toggleLike(comment.commentid)}
              className={clsx(
                "flex items-center gap-1.5 text-xs font-bold transition-colors group/btn",
                comment.isLiked
                  ? "text-error"
                  : "text-base-content/40 hover:text-error",
              )}
            >
              {comment.isLiked ? (
                <HeartIconSolid className="w-3.5 h-3.5" />
              ) : (
                <HeartIconOutline className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
              )}
              {comment.likesCount || 0}
            </button>

            {/* Reply Button (Only allow 1 level of nesting visually for cleaner UI, or allow deep nesting if needed) */}
            <button
              onClick={() =>
                setReplyingToId(isReplying ? null : comment.commentid)
              }
              className="flex items-center gap-1.5 text-xs font-bold text-base-content/40 hover:text-primary transition-colors"
            >
              <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
              回复
            </button>

            {/* More Options */}
            <button className="text-base-content/30 hover:text-base-content/60 transition-colors opacity-0 group-hover:opacity-100">
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Reply Input Box */}
          {isReplying && (
            <div className="mt-3 flex gap-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex-1 relative">
                <textarea
                  autoFocus
                  className="textarea textarea-bordered textarea-sm w-full h-20 bg-base-100 focus:ring-1 focus:ring-primary/20 resize-none rounded-xl text-sm"
                  placeholder={`回复 @${getDisplayName(comment.User)}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                ></textarea>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyContent("");
                    }}
                    className="btn btn-xs btn-ghost text-base-content/50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleReplySubmit(comment.commentid)}
                    disabled={!replyContent.trim()}
                    className="btn btn-xs btn-primary text-primary-content"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nested Replies (Recursive) */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="pl-2 border-l-2 border-base-200/50">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.commentid}
                  comment={reply}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    // Container
    <div className="bg-base-100 rounded-[1.5rem] md:rounded-[2rem] shadow-sm ring-1 ring-base-200/50 overflow-hidden">
      {/* Header */}
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
        {/* Main Input Area */}
        {session ? (
          <form
            onSubmit={handleSubmit}
            className="mb-10 flex gap-4 md:gap-6 items-start group"
          >
            <div className="avatar placeholder pt-1 shrink-0">
              <div className="bg-primary/10 text-primary rounded-full w-10 h-10 md:w-12 md:h-12 ring-2 ring-base-100 shadow-sm">
                {session.user?.image ? (
                  <img src={session.user.image} alt="me" />
                ) : (
                  <span className="text-sm font-bold">我</span>
                )}
              </div>
            </div>

            <div className="flex-1 relative">
              <textarea
                className="textarea w-full h-28 text-base p-4 bg-base-200/30 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-2xl resize-none shadow-inner placeholder:text-base-content/30 border-transparent focus:outline-none"
                placeholder="分享你的见解或疑问..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmitting}
              ></textarea>

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
                  className="btn btn-sm btn-primary rounded-xl shadow-lg shadow-primary/20 border-none"
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
          // Guest State
          <div className="mb-12 p-8 md:p-10 bg-base-200/30 rounded-3xl border border-dashed border-base-300 text-center">
            <div className="max-w-md mx-auto flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-base-200 rounded-full flex items-center justify-center text-base-content/30">
                <UserCircleIcon className="w-6 h-6" />
              </div>
              <p className="text-base-content/60 text-sm font-medium">
                登录后参与讨论，记录你的学习点滴
              </p>
              <button
                className="btn btn-primary btn-sm px-6 rounded-full shadow-lg"
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

        {/* Comments List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-dots loading-lg text-primary/40"></span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-content/40 italic text-sm">
                还没有人发言，来抢沙发吧！
              </p>
            </div>
          ) : (
            comments.map((c) => <CommentItem key={c.commentid} comment={c} />)
          )}
        </div>
      </div>
    </div>
  );
}
