import clsx from "clsx";
import { UserCircleIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { UseEpisodeCommentsReturn } from "./useEpisodeComments";

export function CommentForm({
  hookOptions,
}: {
  hookOptions: UseEpisodeCommentsReturn;
}) {
  const {
    session,
    commentContent,
    setCommentContent,
    isSubmitting,
    handleSubmit,
  } = hookOptions;

  if (!session) {
    return (
      <div className="p-8 md:p-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-[#e7eeff] dark:border-slate-800 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
            <UserCircleIcon className="w-6 h-6" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
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
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-4 md:gap-6 items-start group"
    >
      <div className="avatar placeholder pt-1 shrink-0">
        <div className="bg-primary/10 text-primary rounded-full w-10 h-10 md:w-12 md:h-12 ring-2 ring-white dark:ring-slate-900 shadow-sm">
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
          className="textarea w-full h-32 text-base p-4 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-[#e7eeff] dark:border-slate-800 focus:border-primary transition-all rounded-2xl resize-none shadow-sm placeholder:text-slate-400 focus:outline-none text-left align-top"
          placeholder="分享你的见解或疑问..."
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          disabled={isSubmitting}
        ></textarea>

        <div className="absolute bottom-3 right-3 flex items-center gap-3">
          <span
            className={clsx(
              "text-xs transition-opacity font-mono text-slate-400",
              commentContent.length > 0 ? "opacity-100" : "opacity-0",
            )}
          >
            {commentContent.length}
          </span>
          <button
            type="submit"
            className="btn btn-primary rounded-xl shadow-lg shadow-primary/20 border-none"
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
  );
}
