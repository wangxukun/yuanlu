"use client";

import { useState, useMemo } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { createTag, updateTag, deleteTag } from "@/lib/actions/tag-actions";
import { toast } from "sonner";

interface TagData {
  id: number;
  name: string;
  _count: {
    podcasts: number;
    episodes: number;
  };
}

export default function TagManager({
  initialTags,
}: {
  initialTags: TagData[];
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // 客户端过滤搜索
  const filteredTags = useMemo(() => {
    return initialTags.filter((tag) =>
      tag.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [initialTags, query]);

  // 创建标签
  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    const res = await createTag(formData);
    setLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("标签创建成功");
      setIsCreating(false);
      // 清空表单可以通过 key 刷新或 ref 实现，这里简单处理
      (document.getElementById("create-tag-form") as HTMLFormElement)?.reset();
    }
  };

  // 开始编辑
  const startEdit = (tag: TagData) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingId) return;
    if (editName.trim() === "") return toast.error("名称不能为空");

    const res = await updateTag(editingId, editName);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("更新成功");
      setEditingId(null);
    }
  };

  // 删除标签
  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个标签吗？关联的数据将失去此标签。")) return;

    const res = await deleteTag(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("删除成功");
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-ink-100 shadow-sm">
        <div className="relative w-full sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-ink-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border-0 py-2 pl-10 text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder="搜索标签..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary btn-sm gap-2 w-full sm:w-auto"
        >
          <PlusIcon className="w-4 h-4" />
          新建标签
        </button>
      </div>

      {/* 新建标签表单 (可折叠) */}
      {isCreating && (
        <div className="bg-info-50/50 border border-info-100 rounded-xl p-4 animate-in slide-in-from-top-2">
          <form
            id="create-tag-form"
            action={handleCreate}
            className="flex gap-2 items-center"
          >
            <input
              name="name"
              type="text"
              autoFocus
              placeholder="输入新标签名称，例如：Business English"
              className="input input-bordered input-sm flex-1 max-w-md bg-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm"
            >
              {loading ? "创建中..." : "确认"}
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="btn btn-ghost btn-sm"
            >
              取消
            </button>
          </form>
        </div>
      )}

      {/* 标签列表网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTags.map((tag) => (
          <div
            key={tag.id}
            className={`group relative bg-white p-4 rounded-xl border transition-all duration-200 ${
              editingId === tag.id
                ? "border-primary ring-1 ring-primary shadow-md"
                : "border-ink-100 hover:border-ink-200 hover:shadow-sm"
            }`}
          >
            {editingId === tag.id ? (
              // 编辑模式
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered input-sm w-full"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                />
                <button
                  onClick={saveEdit}
                  className="btn btn-square btn-success btn-xs"
                >
                  <CheckIcon className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="btn btn-square btn-ghost btn-xs"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // 展示模式
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="mt-1 p-2 bg-ink-50 rounded-lg text-ink-400 group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                    <TagIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-ink-900 truncate"
                      title={tag.name}
                    >
                      {tag.name}
                    </h3>
                    <div className="flex gap-3 mt-1.5 text-xs text-ink-500">
                      <span className="flex items-center gap-1 bg-ink-50 px-2 py-0.5 rounded-full border border-ink-100">
                        🎙️ {tag._count.podcasts} 播客
                      </span>
                      <span className="flex items-center gap-1 bg-ink-50 px-2 py-0.5 rounded-full border border-ink-100">
                        🎵 {tag._count.episodes} 单集
                      </span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 (悬停显示) */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(tag)}
                    className="p-1.5 text-ink-400 hover:text-info-600 hover:bg-info-50 rounded-md transition-colors"
                    title="编辑"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="p-1.5 text-ink-400 hover:text-error-600 hover:bg-error-50 rounded-md transition-colors"
                    title="删除"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredTags.length === 0 && (
          <div className="col-span-full py-12 text-center text-ink-400 bg-ink-50 rounded-xl border border-dashed border-ink-200">
            <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>没有找到相关标签</p>
          </div>
        )}
      </div>
    </div>
  );
}
