"use client";

export default function Page() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>系列</h1>
        <audio controls>
          <source src="/static/audio/20240815.mp3" type="audio/mp3" />
          <track
            src="/static/audio/20240815.vtt"
            kind="subtitles"
            srcLang="en"
            label="英文字幕"
          />
        </audio>
      </main>
    </div>
  );
}
