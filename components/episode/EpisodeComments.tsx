"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon as HeartIconOutline,
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  FlagIcon,
  ClipboardDocumentIcon,
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
    learnLevel?: string | null;
  } | null;
}

interface Comment {
  commentid: number;
  userid: string | null;
  episodeid: string | null;
  commentText: string | null;
  commentAt: string;
  User: CommentUser | null;
  parentId?: number | null;
  likesCount?: number;
  isLiked?: boolean;
  replies?: Comment[];
}

export default function EpisodeComments({ episodeId }: { episodeId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  // 顶层评论仍保持受控模式
  const [commentContent, setCommentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply State
  const [replyingToId, setReplyingToId] = useState<number | null>(null);

  // [修复] 中文输入法兼容性：使用 useRef
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // --- Helper: Build Tree Structure ---
  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const roots: Comment[] = [];

    // 1. Initialize
    flatComments.forEach((c) => {
      commentMap.set(c.commentid, { ...c, replies: [] });
    });

    // 2. Build Tree
    flatComments.forEach((c) => {
      const comment = commentMap.get(c.commentid)!;
      if (c.parentId) {
        const parent = commentMap.get(c.parentId);
        if (parent) {
          parent.replies?.push(comment);
        } else {
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });
    return roots;
  };

  // --- Fetch Data ---
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/comment/list?episodeid=${episodeId}`);
        if (res.ok) {
          const flatData: Comment[] = await res.json();
          const treeData = buildCommentTree(flatData);
          setComments(treeData);
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
        newComment.replies = [];
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

  const handleReplySubmit = async (parentId: number) => {
    const content = replyInputRef.current?.value;
    if (!content || !content.trim() || !session) return;

    try {
      const res = await fetch("/api/comment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeid: episodeId,
          content: content,
          parentId: parentId,
        }),
      });

      if (res.ok) {
        const newReply: Comment = await res.json();
        newReply.replies = [];

        const addReplyToTree = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.commentid === parentId) {
              return { ...c, replies: [newReply, ...(c.replies || [])] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: addReplyToTree(c.replies) };
            }
            return c;
          });
        };

        setComments((prev) => addReplyToTree(prev));
        if (replyInputRef.current) replyInputRef.current.value = "";
        setReplyingToId(null);
      }
    } catch (error) {
      console.error("Reply failed", error);
    }
  };

  const toggleLike = async (commentId: number) => {
    if (!session) {
      const modal = document.getElementById(
        "email_check_modal_box",
      ) as HTMLDialogElement;
      if (modal) modal.showModal();
      return;
    }

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

    try {
      await fetch("/api/comment/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
    } catch (error) {
      console.error("Like failed", error);
    }
  };

  // [新增] 删除评论 Action
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("确定要删除这条评论吗？")) return;

    // 1. 备份当前的评论列表（用于回滚）
    const previousComments = [...comments];

    // 2. 乐观更新：先从界面移除
    const removeCommentFromTree = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => c.commentid !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies ? removeCommentFromTree(c.replies) : [],
        }));
    };
    setComments((prev) => removeCommentFromTree(prev));

    try {
      // 3. 实际调用 API
      const res = await fetch("/api/comment/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("删除失败，请稍后重试");
      // 4. 如果失败，回滚状态
      setComments(previousComments);
    }
  };

  // [新增] 复制评论内容 Action
  const handleCopyComment = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      // 可以加个 Toast 提示，这里略
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

  // --- Recursive Component ---
  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const isReplying = replyingToId === comment.commentid;
    const isOwner = session?.user?.userid === comment.userid;

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
              "bg-base-200 p-3 md:p-4 rounded-2xl rounded-tl-none text-base-content/80 leading-relaxed hover:bg-base-200/60 transition-colors",
              isReply ? "text-xs md:text-sm" : "text-sm md:text-base",
            )}
          >
            <p
              className="whitespace-pre-wrap break-words text-left"
              style={{ direction: "ltr" }}
            >
              {comment.commentText}
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-5 mt-2 ml-1 relative">
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

            <button
              onClick={() =>
                setReplyingToId(isReplying ? null : comment.commentid)
              }
              className="flex items-center gap-1.5 text-xs font-bold text-base-content/40 hover:text-primary transition-colors"
            >
              <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
              回复
            </button>

            {/* [集成] Actions Dropdown */}
            {/* 使用 dropdown-end 靠右对齐，z-50 确保在最上层 */}
            <div className="dropdown dropdown-end dropdown-hover group/menu">
              <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-1 text-base-content/30 hover:text-base-content/60 transition-colors opacity-0 group-hover:opacity-100 group-focus/menu:opacity-100"
              >
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content z-50 menu p-2 shadow-xl bg-base-100 rounded-box w-32 border border-base-200 text-xs"
              >
                <li>
                  <button
                    onClick={() => handleCopyComment(comment.commentText)}
                  >
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" /> 复制
                  </button>
                </li>
                {isOwner ? (
                  <li>
                    <button
                      onClick={() => handleDeleteComment(comment.commentid)}
                      className="text-error hover:text-error hover:bg-error/10"
                    >
                      <TrashIcon className="w-3.5 h-3.5" /> 删除
                    </button>
                  </li>
                ) : (
                  <li>
                    <button
                      onClick={() => alert("已举报")}
                      className="hover:text-warning"
                    >
                      <FlagIcon className="w-3.5 h-3.5" /> 举报
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Reply Input Box - 使用 useRef + Style 修复 */}
          {isReplying && (
            <div className="mt-3 flex gap-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex-1 relative">
                <textarea
                  autoFocus
                  ref={replyInputRef}
                  style={{ direction: "ltr", textAlign: "left" }}
                  className="textarea textarea-bordered textarea-sm w-full h-20 bg-base-100 focus:ring-1 focus:ring-primary/20 resize-none rounded-xl text-sm text-left align-top"
                  placeholder={`回复 @${getDisplayName(comment.User)}...`}
                ></textarea>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setReplyingToId(null);
                      if (replyInputRef.current)
                        replyInputRef.current.value = "";
                    }}
                    className="btn btn-xs btn-ghost text-base-content/50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleReplySubmit(comment.commentid)}
                    className="btn btn-xs btn-primary text-primary-content"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nested Replies */}
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
    // [修复关键点] 移除了 overflow-hidden，防止底部 Dropdown 被裁切
    // 保留 rounded 和 ring 样式，因为子元素都有 padding 缩进，通常不会破坏圆角
    <div className="bg-base-100 rounded-[1.5rem] md:rounded-[2rem] shadow-sm ring-1 ring-base-200/50">
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
                  <span className="flex items-center justify-center w-full h-full text-sm font-bold">
                    我
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 relative">
              <textarea
                style={{ direction: "ltr", textAlign: "left" }}
                className="textarea w-full h-28 text-base p-4 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-2xl resize-none shadow-inner placeholder:text-base-content/30 border-transparent focus:outline-none text-left align-top"
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
          <div className="mb-12 p-8 md:p-10 bg-base-200 rounded-3xl border border-dashed border-base-300 text-center">
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
