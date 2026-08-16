import { Session } from "next-auth";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";

export function checkExclusivePlay(
  episode: { isExclusive?: boolean | null },
  session: Session | null,
): boolean {
  if (episode.isExclusive) {
    if (!session?.user) {
      toast.error("PRO剧集仅对会员开放");
      return false;
    }
    if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
      useUIStore.getState().openPremiumModal("exclusive_play");
      return false;
    }
  }
  return true;
}
