import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { UseEpisodeCommentsReturn } from "./useEpisodeComments";

/**
 * 评论发布失败弹窗（daisyUI，替代原生 alert）。
 * 根评论与回复两条发布链路共用；文案来自后端 error——
 * msgSecCheck 安全拦截时即「内容未通过安全检测，请修改后重试」。
 * 响应式与 DeleteCommentModal 同款：移动端底部抽屉（modal-bottom）、
 * ≥sm 断点居中（sm:modal-middle）。
 */
export function CommentFailModal({
  hookOptions,
}: {
  hookOptions: UseEpisodeCommentsReturn;
}) {
  const { commentFailMessage } = hookOptions;

  return (
    <dialog
      id="comment_fail_modal"
      className="modal modal-bottom sm:modal-middle"
    >
      <div className="modal-box bg-base-100 border border-base-200 shadow-e3 rounded-xl">
        <h3 className="font-bold text-lg text-error-500 dark:text-error-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-6 h-6" />
          发布失败
        </h3>
        <p className="py-4 text-base-content/60">
          {commentFailMessage || "发布失败，请稍后重试"}
        </p>
        <div className="modal-action">
          <form method="dialog" className="flex gap-2">
            <button className="btn btn-primary rounded-xl">我知道了</button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
