"use client";

import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  selectedTags: string[]; // 当前选中的标签名称列表
  onChange: (tags: string[]) => void;
  maxSelected?: number;
}

export const TagSelector: React.FC<Props> = ({
  selectedTags,
  onChange,
  maxSelected = Infinity,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: number; name: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 点击组件外部时关闭建议列表
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 输入防抖搜索
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!inputValue.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/tag/list?query=${encodeURIComponent(inputValue)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch tags", error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // 添加标签（去重、数量限制检查）
  const addTag = (tag: string) => {
    const newTag = tag.trim();
    if (!newTag) return;
    if (selectedTags.length >= maxSelected) return;
    if (selectedTags.includes(newTag)) {
      setInputValue(""); // 如果已存在，仅清空输入框
      return;
    }

    onChange([...selectedTags, newTag]);
    setInputValue("");
    setShowSuggestions(false);
  };

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // 防止触发表单提交
      addTag(inputValue);
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      selectedTags.length > 0
    ) {
      // 当输入框为空且按下删除键时，移除最后一个标签
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className="w-full max-w-2xl" ref={wrapperRef}>
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg border-base-300 bg-base-100 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
        {/* 已选标签展示 */}
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="badge badge-primary gap-1 py-3 pl-3 pr-2 text-sm font-medium animate-in fade-in zoom-in duration-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-primary-content/70 transition-colors rounded-full p-0.5 hover:bg-primary-content/20"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}

        {/* 输入框与下拉容器 */}
        <div className="relative flex-1 min-w-[120px]">
          <input
            type="text"
            className="w-full bg-transparent outline-none text-base py-1 px-2 placeholder:text-base-content/40"
            placeholder={
              selectedTags.length === 0 ? "输入标签名称..." : "继续添加..."
            }
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            disabled={selectedTags.length >= maxSelected}
          />

          {/* 建议下拉列表 */}
          {showSuggestions && inputValue.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-base-200 transition-colors flex justify-between items-center text-sm"
                    onClick={() => addTag(suggestion.name)}
                  >
                    <span>{suggestion.name}</span>
                    {selectedTags.includes(suggestion.name) && (
                      <span className="text-xs text-success font-medium">
                        已选
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-base-content/60 bg-base-50">
                  按 <kbd className="kbd kbd-sm">Enter</kbd> 创建新标签 "
                  {inputValue}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="flex justify-between items-center mt-1 px-1">
        <span className="text-xs text-base-content/50">
          支持搜索现有标签或直接创建新标签
        </span>
        <span
          className={`text-xs ${selectedTags.length >= maxSelected ? "text-error" : "text-base-content/50"}`}
        >
          {selectedTags.length} / {maxSelected}
        </span>
      </div>
    </div>
  );
};
