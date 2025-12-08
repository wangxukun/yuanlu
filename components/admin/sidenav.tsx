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
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      <Link
        className="mb-2 flex h-32 flex-col items-center justify-center gap-5 rounded-md bg-gray-50 p-4 md:h-40"
        href="/"
      >
        <div className="w-32 text-gray-600 md:w-48">
          <AcmeLogo />
        </div>
        <div className="text-xs font-bold">
          欢迎，
          {/*{session.user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") || ""}*/}
          {session.user?.email?.split("@")[0]}
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>

        <LoginBtn />
      </div>
    </div>
  );
}
