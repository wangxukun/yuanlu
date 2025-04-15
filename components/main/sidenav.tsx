import Link from "next/link";
import NavLinks from "@/components/main/nav-links";
import AcmeLogo from "@/components/acme-logo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
// import { redirect } from "next/navigation";
import NavLinksLogined from "@/components/main/nav-links-logined";

export default async function SideNav() {
  const session = await getServerSession(authOptions);
  if (!session) {
    // redirect("/auth/login");
    console.log("session", session);
  }

  return (
    <aside className="hidden sm:block w-[260px] border-r border-gray-200 h-screen flex flex-col justify-between">
      <Link
        className="mb-2 flex h-32 flex-col items-center justify-center gap-5 rounded-md p-4 md:h-40"
        href="/"
      >
        <div className="w-32 text-gray-600 md:w-40">
          <AcmeLogo />
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <div className="flex flex-col space-y-2 pt-5">
          <span className="hidden pl-7 text-xs md:block">资料库</span>
          <NavLinksLogined />
        </div>
        <div className="hidden h-auto w-full grow rounded-md bg-gray-150 md:block"></div>
      </div>
    </aside>
  );
}
