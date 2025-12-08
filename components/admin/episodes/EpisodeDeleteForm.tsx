import { deleteEpisodeById } from "@/lib/actions";
import React, {
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { redirect } from "next/navigation";
import { ActionState } from "@/lib/types";

export function EpisodeDeleteForm({ id }: { id: string }) {
  const delEpisodeState: ActionState = {
    success: false,
    message: "",
  };
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteEpisodeById.bind(null, id),
    delEpisodeState,
  );
  // 处理 重定向
  useEffect(() => {
    if (state?.message?.startsWith("redirect:")) {
      if (state.message != null) {
        const redirectPath = state.message.split(":")[1];
        console.log("删除资源成功后导航：", redirectPath);
        redirect(redirectPath);
        // TODO FIX：删除用户后，需要重新加载用户列表，否则用户列表中会显示删除的用户
      }
    }
  }, [state]);
  // 模态框状态管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 打开模态框
  const openModal = () => setIsModalOpen(true);
  // 关闭模态框
  const closeModal = () => setIsModalOpen(false);
  // 确认删除操作
  const handleConfirmDelete = (event: React.FormEvent) => {
    event.preventDefault(); // 阻止表单默认提交行为
    const formData = new FormData(event.currentTarget as HTMLFormElement); // 从表单创建 FormData
    // 使用 startTransition 包裹 formActiont
    startTransition(() => {
      formAction(formData); // 传递 FormData 给 formAction
    });
    closeModal(); // 关闭模态框
  };

  return (
    <>
      {/* 删除按钮 */}
      {/*<button*/}
      {/*    onClick={openModal}*/}
      {/*    className="flex items-center rounded-md border border-red-500 bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2"*/}
      {/*>*/}
      {/*  <span className="sr-only">delete</span>*/}
      {/*  <TrashIcon className="h-5 w-5"/>*/}
      {/*</button>*/}
      <button
        onClick={openModal}
        className="flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span>删除稿件</span>
      </button>
      {/* 自定义模态框 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeModal} // 点击背景关闭模态框
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()} // 阻止点击模态框内容时关闭
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              确认删除
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              确定要删除该集音频吗？此操作不可撤销！
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                取消
              </button>
              <form onSubmit={handleConfirmDelete}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  确认删除
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
