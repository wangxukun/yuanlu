import { User } from "@/core/user/user.entity";

export interface UserProfile {
  userid: string;
  nickname: string;
  avatarUrl: string;
  avatarFileName: string;
  bio: string;
  learnLevel: string;
  joinDate: string;
  dailyStudyGoalMins: number;
  weeklyListeningGoalHours: number;
  weeklyWordsGoal: number;
  user: User | undefined;
}
