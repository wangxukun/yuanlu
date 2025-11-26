import { User } from "@/core/user/user.entity";

export interface UserProfile {
  userid: string;
  nickName: string;
  avatarUrl: string;
  avatarFileName: string;
  bio: string;
  learnLevel: string;
  user: User;
}
