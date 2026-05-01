import React from "react";
import { Episode } from "@/core/episode/episode.entity";

export default function ShowNotes({ episode }: { episode: Episode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-800 pb-4 text-slate-900 dark:text-slate-50">
        节目介绍
      </h2>
      <article className="text-lg text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed font-serif">
        <div
          className="[&>p]:mb-6 [&>p]:leading-relaxed [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-6 [&>blockquote]:py-2 [&>blockquote]:italic [&>blockquote]:bg-slate-50 [&>blockquote]:dark:bg-slate-900/50 [&>blockquote]:rounded-r-xl [&>blockquote]:my-6 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6"
          dangerouslySetInnerHTML={{ __html: episode.description || "" }}
        />
      </article>
    </section>
  );
}
