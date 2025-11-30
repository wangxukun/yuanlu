import React, { useState, useRef } from "react";
import {
  MoreVerticalIcon,
  FileTextIcon,
  MessageSquareIcon,
  ImageResultIcon,
} from "./Icons";
import Link from "next/link";

interface ActionDropdownProps {
  episodeId: string;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({ episodeId }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to be compatible with both browser and node environments
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  console.log(episodeId);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // Small delay to prevent flickering when moving mouse
  };

  return (
    <div
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`p-2 rounded-full transition-colors duration-200 ${isOpen ? "bg-indigo-50 text-primary" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVerticalIcon size={18} />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute right-0 top-full mt-1 w-40 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transition-all duration-200 transform ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}`}
      >
        <div className="py-1">
          <Link
            href={`/dashboard/episodes/${episodeId}/subtitles`}
            className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors"
          >
            <FileTextIcon size={16} className="mr-3" />
            <span>字幕管理</span>
          </Link>
          <button className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors">
            <MessageSquareIcon size={16} className="mr-3" />
            <span>评论管理</span>
          </button>
          <button className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors">
            <ImageResultIcon size={16} className="mr-3" />
            <span>封面管理</span>
          </button>
          <div className="border-t border-slate-200 my-1"></div>
          <button className="flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
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
        </div>
      </div>
    </div>
  );
};

export default ActionDropdown;
