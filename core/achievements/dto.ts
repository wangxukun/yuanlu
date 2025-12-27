export interface AchievementItemDto {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null; // ISO Date string
}
