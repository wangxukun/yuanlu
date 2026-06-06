import { toast } from "sonner";
import { Session } from "next-auth";

export function checkExclusivePlay(
  episode: { isExclusive?: boolean | null },
  session: Session | null,
): boolean {
  if (episode.isExclusive) {
    if (!session?.user) {
      toast.error("权限不足，需要高级会员权限");
      const loginModal = document.getElementById(
        "email_check_modal_box",
      ) as HTMLDialogElement;
      if (loginModal) loginModal.showModal();
      return false;
    }
    if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
      toast.error("权限不足，需要高级会员权限");
      return false;
    }
  }
  return true;
}
