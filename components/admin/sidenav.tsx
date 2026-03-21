import Link from "next/link";
import NavLinks from "@/components/admin/nav-links";
import AcmeLogo from "@/components/acme-logo";
import LoginBtn from "@/components/auth/login-btn";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function SideNav() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex h-full flex-col px-4 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Link
        className="mb-6 flex h-32 flex-col items-center justify-center gap-5 rounded-xl bg-base-200/50 p-4 shadow-sm transition-colors hover:bg-base-200"
        href="/"
      >
        <div className="w-32 text-gray-600 md:w-48">
          <AcmeLogo />
        </div>
        <div className="text-xs font-bold">
          欢迎，
          {/*{session.user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") || ""}*/}
          {/* {session.user?.email?.split("@")[0]} */}
          {session.user?.nickname}
        </div>
      </Link>
      <div className="flex grow flex-col space-y-2">
        <NavLinks />
        <div className="h-auto w-full grow rounded-md"></div>

        <LoginBtn />
      </div>
    </div>
  );
}
