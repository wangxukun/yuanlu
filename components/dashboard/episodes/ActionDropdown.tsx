import React, { useState, useRef } from "react";
import {
  MoreVerticalIcon,
  FileTextIcon,
  MessageSquareIcon,
  ImageResultIcon,
} from "./Icons";

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
          <button className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors">
            <FileTextIcon size={16} className="mr-3" />
            <span>字幕管理</span>
          </button>
          <button className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors">
            <MessageSquareIcon size={16} className="mr-3" />
            <span>评论管理</span>
          </button>
          <button className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors">
            <ImageResultIcon size={16} className="mr-3" />
            <span>封面管理</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionDropdown;
