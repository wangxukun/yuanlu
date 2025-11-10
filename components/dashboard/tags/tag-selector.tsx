import React, { useState } from "react";
import { Tag } from "@/app/types/podcast";

type TagType = "PODCAST" | "EPISODE" | "UNIVERSAL";

// interface Tag {
//     tagid: string;
//     name: string;
//     type: TagType;
// }

interface Props {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (selectedIds: string[]) => void;
  allowTypes: TagType[];
  maxSelected?: number;
}

export const TagSelector: React.FC<Props> = ({
  availableTags,
  selectedTagIds,
  onChange,
  allowTypes,
  maxSelected = Infinity,
}) => {
  const [search] = useState("");

  const isAtLimit = selectedTagIds.length >= maxSelected;

  const toggleTag = (event: React.MouseEvent<HTMLElement>, id: string) => {
    event.preventDefault();
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((tagId) => tagId !== id));
    } else if (!isAtLimit) {
      onChange([...selectedTagIds, id]);
    }
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      allowTypes.includes(tag.type) &&
      tag.name.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = {
    UNIVERSAL: [] as Tag[],
    PODCAST: [] as Tag[],
    EPISODE: [] as Tag[],
  };
  for (const tag of filteredTags) {
    grouped[tag.type].push(tag);
  }

  const renderTagGroup = (type: TagType, label: string) => {
    const tags = grouped[type];
    if (!tags.length) return null;
    return (
      <div className="pt-4 pb-4 flex flex-row">
        <div className="flex items-center justify-center mr-4">
          <span>{label}</span>
        </div>
        <div className="flex items-center justify-center flex-wrap gap-2">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.tagid);
            const disabled = !selected && isAtLimit;

            return (
              <button
                key={tag.tagid}
                className={`px-3 py-3 border text-sm inset-shadow-xs transition btn btn-xs ${
                  selected
                    ? "btn-neutral"
                    : disabled
                      ? "btn-outline cursor-not-allowed"
                      : "btn-dash"
                }`}
                onClick={(event) => toggleTag(event, tag.tagid)}
                disabled={disabled}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="card card-border border-neutral flex-1">
      <div className="card-body">
        {/*<input*/}
        {/*  type="text"*/}
        {/*  placeholder="搜索标签..."*/}
        {/*  value={search}*/}
        {/*  onChange={(e) => setSearch(e.target.value)}*/}
        {/*  className="input input-success w-full px-3 py-2 border rounded-md mb-4 text-sm"*/}
        {/*/>*/}

        <div className="flex flex-wrap gap-2 mb-4 bg-white p-5 inset-shadow-xs">
          {selectedTagIds.length === 0 ? (
            <span className="badge px-2 py-3 text-xs">未选择任何标签</span>
          ) : (
            selectedTagIds
              .map((id) => availableTags.find((tag) => tag.tagid === id))
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag!.tagid}
                  className="badge badge-info px-2 py-3 text-xs cursor-pointer hover:bg-primary-content"
                  onClick={(event) => toggleTag(event, tag!.tagid)}
                >
                  {tag!.name} ✕
                </span>
              ))
          )}
        </div>

        {renderTagGroup("UNIVERSAL", "通用标签:")}
        {renderTagGroup("PODCAST", "节目标签:")}
        {renderTagGroup("EPISODE", "单集标签:")}

        {/*{isAtLimit && (*/}
        {/*  <div className="mt-3 text-sm text-red-500">*/}
        {/*    最多只能选择 {maxSelected} 个标签*/}
        {/*  </div>*/}
        {/*)}*/}
      </div>
    </div>
  );
};
