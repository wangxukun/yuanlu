/**
 * @description 手机平板端菜单
 */
import { useSession } from "next-auth/react";
import MenusLinks from "@/components/main/menus-links";
import MenusLinksLogined from "@/components/main/menus-links-logined";

export default function Menus({ onLinkClick }: { onLinkClick: () => void }) {
  const { data: session } = useSession();
  if (!session) {
    // redirect("/auth/login");
    console.log("session", session);
  }
  return (
    <aside className="block w-full h-screen flex-col justify-between">
      <div className="flex grow justify-between flex-col space-x-0 space-y-2">
        <MenusLinks onLinkClick={onLinkClick} />
        <div className="flex flex-col space-y-2 pt-5">
          <span className="pl-7 text-xs block">资料库</span>
          <MenusLinksLogined onLinkClick={onLinkClick} />
        </div>
        {/*<div className="h-auto w-full grow rounded-md bg-gray-150 block"></div>*/}
      </div>
    </aside>
  );
}
