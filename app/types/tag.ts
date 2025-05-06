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
