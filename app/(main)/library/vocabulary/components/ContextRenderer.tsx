import React from "react";

export const renderContext = (
  text?: string | null,
  word?: string,
  hideWord: boolean = false,
  renderHidden?: (word: string, index: number) => React.ReactNode,
) => {
  if (!text || !word)
    return <p className="text-base-content/40 italic">暂无例句</p>;
  const parts = text.split(new RegExp(`(${word})`, "gi"));
  return (
    <p className="leading-relaxed font-serif text-base-content/80 text-lg">
      "
      {parts.map((part, i) =>
        part.toLowerCase() === word.toLowerCase() ? (
          hideWord ? (
            renderHidden ? (
              renderHidden(part, i)
            ) : (
              <span
                key={i}
                className="inline-block w-20 border-b-2 border-primary-600 dark:border-primary-400 mx-1 align-bottom bg-primary-600/10 dark:bg-primary-400/10"
              ></span>
            )
          ) : (
            <span
              key={i}
              className="font-bold text-primary-600 dark:text-primary-400 bg-primary-600/20 dark:bg-primary-400/20 px-1 rounded"
            >
              {part}
            </span>
          )
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
      "
    </p>
  );
};
