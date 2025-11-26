export const TagType = {
  PODCAST: "PODCAST",
  EPISODE: "EPISODE",
  UNIVERSAL: "UNIVERSAL",
} as const;

// 下面这条语句是解决eslint报错的
// eslint-disable-next-line no-redeclare
export type TagType = (typeof TagType)[keyof typeof TagType];

/**
 * Check if a value is a valid TagType
 * @param value
 */
export function isTagType(value: string): value is TagType {
  return Object.values(TagType).includes(value as TagType);
}

export interface TagGroup {
  groupid: string;
  name: string;
  description: string;
  coverUrl: string;
  coverFileName: string;
  sortOrder: number;
  allowedTypes: TagType[];
  tags: Tag[];
  createAt: string;
  updateAt: string;
  tagLinks: TagGroupTag[];
}
export interface TagGroupTag {
  tagid: string;
  groupid: string;
  sortWeight: number;
  tag: Tag;
  group: TagGroup;
}

export interface Tag {
  tagid: string;
  name: string;
  type: TagType;
  isFeatured: boolean;
  coverUrl: string;
  coverFileName: string;
  tagGroupid: string;
  description: string;
  groupLinks: TagGroupTag[];
  group: TagGroup;
}
