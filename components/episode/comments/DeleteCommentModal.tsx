import { TrashIcon } from "@heroicons/react/24/outline";
import { UseEpisodeCommentsReturn } from "./useEpisodeComments";

export function DeleteCommentModal({
  hookOptions,
}: {
  hookOptions: UseEpisodeCommentsReturn;
}) {
  const { isDeleting, confirmDelete } = hookOptions;

  return (
    <dialog
      id="delete_comment_modal"
      className="modal modal-bottom sm:modal-middle"
    >
      <div className="modal-box bg-base-100 border border-base-200 shadow-2xl rounded-2xl">
        <h3 className="font-bold text-lg text-error flex items-center gap-2">
          <TrashIcon className="w-6 h-6" />
          确认删除评论？
        </h3>
        <p className="py-4 text-base-content/60">
          此操作不可撤销。如果该评论包含回复，回复也将一并被删除。
        </p>
        <div className="modal-action">
          <form method="dialog" className="flex gap-2">
            <button className="btn btn-ghost rounded-xl" disabled={isDeleting}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-error rounded-xl text-white"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "确认删除"
              )}
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button disabled={isDeleting}>close</button>
      </form>
    </dialog>
  );
}
