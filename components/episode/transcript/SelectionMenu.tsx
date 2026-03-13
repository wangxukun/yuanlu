import React, { RefObject } from "react";
import clsx from "clsx";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { SelectionMenuState } from "./types";

interface SelectionMenuProps {
  menuRef: RefObject<HTMLDivElement | null>;
  selectionMenu: SelectionMenuState;
  onClose: () => void;
  onWordClick: (word: string, contextEn: string, contextZh: string) => void;
}

export function SelectionMenu({
  menuRef,
  selectionMenu,
  onClose,
  onWordClick,
}: SelectionMenuProps) {
  if (!selectionMenu.visible) return null;

  return (
    <div
      ref={menuRef}
      style={
        {
          "--x": `${selectionMenu.x}px`,
          "--y": `${selectionMenu.y}px`,
        } as React.CSSProperties
      }
      className={clsx(
        "fixed z-[100] flex justify-center pointer-events-auto",
        "bottom-6 left-0 right-0 px-4",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
        "md:bottom-auto md:left-[var(--x)] md:top-[var(--y)] md:right-auto md:px-0",
        "md:-translate-x-1/2 md:-translate-y-full md:-mt-3",
        "md:animate-in md:zoom-in-95 md:fade-in md:slide-in-from-bottom-0",
      )}
    >
      <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-full md:rounded-xl shadow-2xl px-4 py-3 md:py-2 flex items-center gap-3 text-sm border border-slate-700 w-full md:w-auto max-w-sm mx-auto">
        <span className="flex-1 md:flex-none max-w-[150px] md:max-w-[180px] truncate font-serif italic border-r border-slate-600 mr-1 select-none text-slate-300">
          {selectionMenu.text}
        </span>

        <button
          className="hover:text-primary active:scale-95 transition-all flex items-center gap-1.5 font-bold whitespace-nowrap text-white"
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onWordClick(
              selectionMenu.text,
              selectionMenu.contextEn,
              selectionMenu.contextZh,
            );
            window.getSelection()?.removeAllRanges();
            onClose();
          }}
          onClick={() => {
            onWordClick(
              selectionMenu.text,
              selectionMenu.contextEn,
              selectionMenu.contextZh,
            );
            window.getSelection()?.removeAllRanges();
            onClose();
          }}
        >
          <PlusCircleIcon className="w-5 h-5 text-primary" />
          <span>查词/翻译</span>
        </button>
      </div>

      <div className="hidden md:block absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-[40%] rotate-45 w-3 h-3 bg-slate-900/90 border-r border-b border-slate-700"></div>
    </div>
  );
}
