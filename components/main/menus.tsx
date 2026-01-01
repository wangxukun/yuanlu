/**
 * @description 手机平板端菜单
 */
import MenusLinks from "@/components/main/menus-links";
import MenusLinksLogined from "@/components/main/menus-links-logined";
import { useSession } from "next-auth/react";

export default function Menus({ onLinkClick }: { onLinkClick: () => void }) {
  const { data: session, status } = useSession();
  return (
    <aside className="block w-full h-full flex-col justify-between">
      <div className="flex grow justify-between flex-col space-x-0 space-y-2">
        <MenusLinks onLinkClick={onLinkClick} />

        {status === "authenticated" && session && (
          <div className="flex flex-col space-y-2 pt-5 border-t border-base-200 mt-2">
            {/* 将“资料库”改为“我的学习”，更贴切 */}
            <span className="pl-6 text-xs block text-base-content/50 font-bold uppercase tracking-wider">
              我的学习
            </span>
            <MenusLinksLogined onLinkClick={onLinkClick} />
          </div>
        )}
      </div>
    </aside>
  );
}
