import clsx from "clsx";
import { HandThumbUpIcon as ThumbUpIconSolid } from "@heroicons/react/24/solid";
import {
  HandThumbUpIcon as ThumbUpIconOutline,
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Comment, UseEpisodeCommentsReturn } from "./useEpisodeComments";

export function CommentItem({
  comment,
  isReply = false,
  hookOptions,
}: {
  comment: Comment;
  isReply?: boolean;
  hookOptions: UseEpisodeCommentsReturn;
}) {
  const {
    replyingToId,
    setReplyingToId,
    replyInputRef,
    handleReplySubmit,
    toggleLike,
    handleDeleteComment,
    handleCopyComment,
    handleReportComment,
    formatDate,
    getDisplayName,
    session,
  } = hookOptions;

  const isReplying = replyingToId === comment.commentid;
  const isOwner = session?.user?.userid === comment.userid;
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div
      id={`comment-${comment.commentid}`}
      className={clsx(
        "flex gap-3 md:gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500 border-b border-base-300 last:border-0 p-4 transition-all",
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
          {comment.User?.user_profile?.avatarFileName &&
          comment.User.user_profile.avatarUrl ? (
            <img
              src={comment.User.user_profile.avatarUrl}
              alt="av"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src="/static/images/default-avatar.png"
              alt="av"
              className="w-full h-full object-cover"
            />
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
          </div>
          <span className="text-[10px] md:text-xs text-base-content/40 font-mono">
            {formatDate(comment.commentAt)}
          </span>
        </div>

        {/* Comment Bubble */}
        <div
          className={clsx(
            "p-3 md:p-4 rounded-2xl rounded-tl-none text-slate-700 dark:text-slate-200 leading-relaxed",
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
                ? "text-primary"
                : "text-slate-400 hover:text-primary",
            )}
          >
            {comment.isLiked ? (
              <ThumbUpIconSolid className="w-3.5 h-3.5" />
            ) : (
              <ThumbUpIconOutline className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
            )}
            {comment.likesCount || 0}
          </button>

          <button
            onClick={() => {
              if (!session) {
                toast.error("请先登录后再回复评论");
                const modal = document.getElementById(
                  "email_check_modal_box",
                ) as HTMLDialogElement | null;
                if (modal) modal.showModal();
                return;
              }
              setReplyingToId(isReplying ? null : comment.commentid);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-base-content/40 hover:text-primary transition-colors"
          >
            <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
            回复
          </button>

          {/* [集成] Actions Dropdown - hover 改造 */}
          <div className="dropdown dropdown-end group/menu">
            <div
              tabIndex={0}
              role="button"
              className="flex items-center gap-1 text-base-content/30 hover:text-base-content/60 transition-colors focus-within:opacity-100"
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-50 menu p-2 shadow-xl bg-base-100 rounded-box w-32 border border-base-200 text-xs"
            >
              <li>
                <button onClick={() => handleCopyComment(comment.commentText)}>
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" /> 复制
                </button>
              </li>
              {isOwner || isAdmin ? (
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
                    onClick={() => handleReportComment(comment)}
                    className="hover:text-warning"
                  >
                    <FlagIcon className="w-3.5 h-3.5" /> 举报
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Reply Input Box */}
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
                    if (replyInputRef.current) replyInputRef.current.value = "";
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
                hookOptions={hookOptions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
