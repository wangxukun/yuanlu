import React from "react";

type TagType = "PODCAST" | "EPISODE" | "UNIVERSAL";

interface Tag {
  id: string;
  name: string;
  type: TagType;
}

interface Props {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (selectedIds: string[]) => void;
  allowTypes: TagType[]; // e.g., ["EPISODE", "UNIVERSAL"]
}

export const TagSelector: React.FC<Props> = ({
  availableTags,
  selectedTagIds,
  onChange,
  allowTypes,
}) => {
  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((tagId) => tagId !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  const grouped = {
    UNIVERSAL: [] as Tag[],
    PODCAST: [] as Tag[],
    EPISODE: [] as Tag[],
  };

  for (const tag of availableTags) {
    if (allowTypes.includes(tag.type)) {
      grouped[tag.type].push(tag);
    }
  }

  const renderTagGroup = (type: TagType, label: string) => {
    const tags = grouped[type];
    if (!tags.length) return null;
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-600 mt-4">{label}</h4>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`px-3 py-1 rounded-full border text-sm ${
                selectedTagIds.includes(tag.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 border rounded-xl bg-white shadow">
      <h3 className="text-md font-bold mb-2">已选标签</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedTagIds.length === 0 ? (
          <p className="text-gray-400">未选择任何标签</p>
        ) : (
          selectedTagIds
            .map((id) => availableTags.find((tag) => tag.id === id))
            .filter(Boolean)
            .map((tag) => (
              <span
                key={tag!.id}
                className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-200"
                onClick={() => toggleTag(tag!.id)}
              >
                {tag!.name} ✕
              </span>
            ))
        )}
      </div>
      {renderTagGroup("UNIVERSAL", "通用标签")}
      {renderTagGroup("PODCAST", "节目标签")}
      {renderTagGroup("EPISODE", "单集标签")}
    </div>
  );
};
