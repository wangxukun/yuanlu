import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export interface CommentUser {
  userid: string;
  email: string;
  user_profile: {
    nickname: string | null;
    avatarUrl: string | null;
    avatarFileName: string | null;
    learnLevel?: string | null;
  } | null;
}

export interface Comment {
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

export function useEpisodeComments(episodeId: string) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const roots: Comment[] = [];

    flatComments.forEach((c) => {
      commentMap.set(c.commentid, { ...c, replies: [] });
    });

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

  useEffect(() => {
    if (!isLoading && comments.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#comment-")) {
        setTimeout(() => {
          const element = document.getElementById(hash.substring(1));
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("bg-primary/10", "rounded-xl");
            setTimeout(() => {
              element.classList.remove("bg-primary/10", "rounded-xl");
            }, 3000);
          }
        }, 100);
      }
    }
  }, [isLoading, comments]);

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

  const handleDeleteComment = (commentId: number) => {
    setDeleteConfirmId(commentId);
    const modal = document.getElementById(
      "delete_comment_modal",
    ) as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    const previousComments = [...comments];

    const removeCommentFromTree = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => c.commentid !== deleteConfirmId)
        .map((c) => ({
          ...c,
          replies: c.replies ? removeCommentFromTree(c.replies) : [],
        }));
    };
    setComments((prev) => removeCommentFromTree(prev));

    try {
      const res = await fetch("/api/comment/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: deleteConfirmId }),
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      const modal = document.getElementById(
        "delete_comment_modal",
      ) as HTMLDialogElement;
      if (modal) modal.close();
      toast.success("评论已删除");
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("删除失败，请稍后重试");
      setComments(previousComments);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleCopyComment = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleReportComment = async (comment: Comment) => {
    try {
      const reporterName = session?.user?.email
        ? `${session.user.nickname || "无昵称"} (${session.user.email})`
        : "未登录游客";

      const authorName = comment.User
        ? `${comment.User.user_profile?.nickname || "无昵称"} (${comment.User.email})`
        : "未知用户";

      const reportTime = new Date().toLocaleString("zh-CN");

      const res = await fetch("/api/comment/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId: comment.commentid,
          reporterName,
          reportTime,
          commentText: comment.commentText,
          commentAt: formatDate(comment.commentAt),
          targetUrl: window.location.href,
          authorName,
        }),
      });

      if (res.ok) {
        toast.success("已举报");
      } else {
        throw new Error("举报失败");
      }
    } catch (error) {
      console.error("Report failed", error);
      toast.error("举报提交失败");
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

  return {
    comments,
    isLoading,
    commentContent,
    setCommentContent,
    isSubmitting,
    handleSubmit,
    replyingToId,
    setReplyingToId,
    replyInputRef,
    handleReplySubmit,
    toggleLike,
    handleDeleteComment,
    deleteConfirmId,
    isDeleting,
    confirmDelete,
    handleCopyComment,
    handleReportComment,
    formatDate,
    getDisplayName,
    session,
  };
}

export type UseEpisodeCommentsReturn = ReturnType<typeof useEpisodeComments>;
