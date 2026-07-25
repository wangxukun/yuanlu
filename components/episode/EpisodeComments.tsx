"use client";

import { useEpisodeComments } from "./comments/useEpisodeComments";
import { CommentForm } from "./comments/CommentForm";
import { CommentItem } from "./comments/CommentItem";
import { DeleteCommentModal } from "./comments/DeleteCommentModal";

export default function EpisodeComments({ episodeId }: { episodeId: string }) {
  const hookOptions = useEpisodeComments(episodeId);
  const { isLoading, comments } = hookOptions;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-8">
        {/* Main Input Area */}
        <CommentForm hookOptions={hookOptions} />

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-dots loading-lg text-primary/40"></span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 italic text-sm">
                还没有人发言，来抢沙发吧！
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <CommentItem
                key={c.commentid}
                comment={c}
                hookOptions={hookOptions}
              />
            ))
          )}
        </div>
      </div>

      {/* 删除确认 Modal */}
      <DeleteCommentModal hookOptions={hookOptions} />
    </div>
  );
}
