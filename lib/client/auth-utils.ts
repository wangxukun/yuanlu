import { Session } from "next-auth";
import { useUIStore } from "@/store/ui-store";

export function checkExclusivePlay(
  episode: { isExclusive?: boolean | null },
  session: Session | null,
): boolean {
  if (episode.isExclusive) {
    if (!session?.user) {
      useUIStore.getState().openPremiumModal();
      const loginModal = document.getElementById(
        "email_check_modal_box",
      ) as HTMLDialogElement;
      if (loginModal) loginModal.showModal();
      return false;
    }
    if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
      useUIStore.getState().openPremiumModal();
      return false;
    }
  }
  return true;
}
