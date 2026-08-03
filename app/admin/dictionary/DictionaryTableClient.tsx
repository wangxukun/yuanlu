"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
  TrashIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import DictionaryDetailModal from "./DictionaryDetailModal";
import RegenerateConfirmModal from "./RegenerateConfirmModal";
import { deleteDictionaryAction } from "@/lib/actions/admin/dictionary.actions";

export default function DictionaryTableClient({
  initialData,
  total,
  currentPage,
  pageSize,
  searchQuery,
}: {
  initialData: any[];
  total: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [detailModalData, setDetailModalData] = useState<any | null>(null);
  const [regenerateWord, setRegenerateWord] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 500);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch((err) => toast.error("播放失败: " + err.message));
  };

  const handleDelete = async (id: string, word: string) => {
    if (!confirm(`确定要删除单词 "${word}" 吗？`)) return;
    setIsDeleting(id);
    const res = await deleteDictionaryAction(id, word);
    setIsDeleting(null);
    if (res.success) {
      toast.success("删除成功");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="bg-base-100 rounded-xl shadow-sm p-4 border border-base-200">
      {/* 搜索栏 */}
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          placeholder="搜索单词..."
          className="input input-bordered w-full max-w-xs"
          defaultValue={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="text-sm text-base-content/60">共 {total} 个单词</div>
      </div>

      {/* 列表 */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>单词</th>
              <th>音标</th>
              <th>发音</th>
              <th>简要释义</th>
              <th>收藏数</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {initialData.map((item) => {
              const dictData = item.data || {};
              const usPhonetic = dictData.phonetics?.us;
              const ukPhonetic = dictData.phonetics?.uk;
              const usAudio = dictData.audio_urls?.us;
              const ukAudio = dictData.audio_urls?.uk;
              const definitions = dictData.definitions || [];
              const firstDef = definitions[0]
                ? `${definitions[0].pos} ${definitions[0].meaning_cn}`
                : "-";

              return (
                <tr key={item.id} className="hover">
                  <td>
                    <button
                      className="font-bold text-primary hover:underline"
                      onClick={() => setDetailModalData(item)}
                    >
                      {item.word}
                    </button>
                  </td>
                  <td>
                    {usPhonetic && (
                      <span className="mr-2">US: /{usPhonetic}/</span>
                    )}
                    {ukPhonetic && <span>UK: /{ukPhonetic}/</span>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {usAudio && (
                        <button
                          className="btn btn-xs btn-ghost btn-circle"
                          onClick={() => playAudio(usAudio)}
                          title="美音发音"
                        >
                          <SpeakerWaveIcon className="w-4 h-4 text-secondary" />
                        </button>
                      )}
                      {ukAudio && (
                        <button
                          className="btn btn-xs btn-ghost btn-circle"
                          onClick={() => playAudio(ukAudio)}
                          title="英音发音"
                        >
                          <SpeakerWaveIcon className="w-4 h-4 text-accent" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate" title={firstDef}>
                    {firstDef}
                  </td>
                  <td>
                    <span
                      className={`badge ${item.favoriteCount > 0 ? "badge-primary" : "badge-ghost"}`}
                    >
                      {item.favoriteCount}
                    </span>
                  </td>
                  <td className="text-right space-x-2">
                    <button
                      className="btn btn-sm btn-outline btn-info"
                      onClick={() => setRegenerateWord(item.word)}
                      title="重新生成"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-outline btn-error"
                      onClick={() => handleDelete(item.id, item.word)}
                      disabled={
                        item.favoriteCount > 0 || isDeleting === item.id
                      }
                      title={
                        item.favoriteCount > 0 ? "有用户收藏，禁止删除" : "删除"
                      }
                    >
                      {isDeleting === item.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {initialData.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-base-content/50"
                >
                  没有找到单词记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              上一页
            </button>
            <button className="join-item btn btn-sm no-animation">
              第 {currentPage} 页 / 共 {totalPages} 页
            </button>
            <button
              className="join-item btn btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {detailModalData && (
        <DictionaryDetailModal
          data={detailModalData}
          onClose={() => setDetailModalData(null)}
        />
      )}

      {regenerateWord && (
        <RegenerateConfirmModal
          word={regenerateWord}
          currentData={initialData.find((i) => i.word === regenerateWord)?.data}
          onClose={() => setRegenerateWord(null)}
        />
      )}
    </div>
  );
}
