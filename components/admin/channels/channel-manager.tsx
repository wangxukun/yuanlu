"use client";

import { useState } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  SignalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import UploadCover from "@/components/admin/episodes/uploadCover";
import {
  createChannelAction,
  updateChannelAction,
  deleteChannelAction,
} from "@/lib/actions/channel-actions";
import { toast } from "sonner";

export interface AdminChannelItem {
  name: string;
  podcastCount: number;
  episodeCount: number;
  totalPlays: number;
  coverUrl: string;
  row: {
    channelid: string;
    coverFileName: string | null;
    description: string | null;
    sortOrder: number;
  } | null;
}

function ChannelForm({
  item,
  onDone,
}: {
  item: AdminChannelItem;
  onDone: () => void;
}) {
  const isEdit = !!item.row;
  const [coverFileName, setCoverFileName] = useState(
    item.row?.coverFileName ?? "",
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    const res = isEdit
      ? await updateChannelAction(formData)
      : await createChannelAction(formData);
    setSaving(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(isEdit ? "频道配置已更新" : "频道配置已创建");
      onDone();
    }
  };

  return (
    <form
      action={handleSubmit}
      className="mt-4 pt-4 border-t border-ink-100 space-y-4 animate-in slide-in-from-top-2"
    >
      {isEdit && (
        <input type="hidden" name="channelid" value={item.row!.channelid} />
      )}
      {!isEdit && <input type="hidden" name="name" value={item.name} />}
      <input type="hidden" name="coverFileName" value={coverFileName} />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <SignalIcon className="w-5 h-5 text-ink-400 flex-none" />
            <span className="font-semibold text-ink-900">{item.name}</span>
            <span className="text-xs text-ink-400">
              名称需与节目所属 platform 一致
            </span>
          </div>

          <label className="form-control">
            <div className="label py-1">
              <span className="label-text text-xs text-ink-500">
                排序权重（小的在前，未配置频道排在最后）
              </span>
            </div>
            <input
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={item.row?.sortOrder ?? 99}
              className="input input-bordered input-sm w-32 bg-white"
            />
          </label>

          <label className="form-control">
            <div className="label py-1">
              <span className="label-text text-xs text-ink-500">
                频道描述（可选，展示于频道列表）
              </span>
            </div>
            <textarea
              name="description"
              rows={2}
              defaultValue={item.row?.description ?? ""}
              placeholder="例如：BBC 旗下英语教学频道，涵盖日常、新闻与发音"
              className="textarea textarea-bordered textarea-sm w-full bg-white"
            />
          </label>
        </div>

        <div className="flex-none">
          <div className="label py-1">
            <span className="label-text text-xs text-ink-500">
              品牌横幅（建议 1280×720，16:9）
            </span>
          </div>
          <UploadCover
            coverApi="/api/admin/channel/upload-cover"
            onUploadComplete={(res) => {
              if (res.coverFileName) {
                setCoverFileName(res.coverFileName);
                toast.success("横幅已上传，保存后生效");
              }
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary btn-sm"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">
          取消
        </button>
      </div>
    </form>
  );
}

export default function ChannelManager({
  items,
}: {
  items: AdminChannelItem[];
}) {
  const [editingName, setEditingName] = useState<string | null>(null);

  const handleDelete = async (item: AdminChannelItem) => {
    if (!item.row) return;
    if (
      !confirm(
        `确定删除「${item.name}」的频道配置吗？\n（不影响 OSS 横幅与播客数据，频道将回退代表封面展示）`,
      )
    )
      return;

    const res = await deleteChannelAction(item.row.channelid);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("频道配置已删除");
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isEditing = editingName === item.name;
        return (
          <div
            key={item.name}
            className={`bg-white rounded-xl border transition-all duration-200 ${
              isEditing
                ? "border-primary-600 dark:border-primary-400 shadow-md"
                : "border-ink-100 hover:border-ink-200 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center gap-4 p-4">
              {/* 横幅缩略图 */}
              <div className="w-32 aspect-video flex-none rounded-lg overflow-hidden border border-ink-100 bg-ink-50">
                <img
                  src={item.coverUrl}
                  alt={`${item.name} 封面`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 信息 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-ink-900 truncate">
                    {item.name}
                  </h3>
                  {item.row ? (
                    <span className="badge badge-sm bg-primary-600/10 text-primary-700 border-none">
                      已配置 · 序 {item.row.sortOrder}
                    </span>
                  ) : (
                    <span className="badge badge-sm bg-ink-100 text-ink-500 border-none">
                      未配置
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-ink-500">
                  <span>{item.podcastCount} 档节目</span>
                  <span>{item.episodeCount} 集</span>
                  <span>{item.totalPlays.toLocaleString()} 次播放</span>
                </div>
                {item.row?.description && (
                  <p className="mt-1 text-xs text-ink-400 line-clamp-1">
                    {item.row.description}
                  </p>
                )}
              </div>

              {/* 操作 */}
              <div className="flex gap-1 flex-none">
                <button
                  onClick={() => setEditingName(isEditing ? null : item.name)}
                  className="btn btn-ghost btn-xs gap-1 text-info-600"
                  title={item.row ? "编辑配置" : "配置频道"}
                >
                  {isEditing ? (
                    <XMarkIcon className="w-4 h-4" />
                  ) : item.row ? (
                    <PencilSquareIcon className="w-4 h-4" />
                  ) : (
                    <PlusIcon className="w-4 h-4" />
                  )}
                  {isEditing ? "收起" : item.row ? "编辑" : "配置"}
                </button>
                {item.row && !isEditing && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="btn btn-ghost btn-xs gap-1 text-error-600"
                    title="删除配置"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="px-4 pb-4">
                <ChannelForm
                  key={item.name}
                  item={item}
                  onDone={() => setEditingName(null)}
                />
              </div>
            )}
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="py-12 text-center text-ink-400 bg-ink-50 rounded-xl border border-dashed border-ink-200">
          <SignalIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>暂无频道数据（先在后台创建节目并填写 platform 字段）</p>
        </div>
      )}
    </div>
  );
}
