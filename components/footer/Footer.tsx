"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-base-100 border-t border-base-200 py-6 w-full mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-base-content/70 gap-4">
          {/* 版权信息 */}
          <div className="text-center md:text-left">
            <p>&copy; {new Date().getFullYear()} 远路播客. 保留所有权利。</p>
          </div>

          {/* 链接区域 */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <Link
              href="/contact"
              className="hover:text-primary transition-colors font-medium"
            >
              联系我们
            </Link>

            {/* 分隔线：仅在桌面端显示，与备案信息同步 */}
            <div className="hidden lg:block w-px h-3 bg-base-300"></div>

            {/* 备案信息：仅在桌面端 (lg及以上) 显示 */}
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:block text-neutral-content hover:text-primary transition-colors"
            >
              滇ICP备2023001663号
            </a>

            <a
              href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=53032202530362"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:block text-neutral-content hover:text-primary transition-colors"
            >
              滇公网安备 53032202530362号
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
