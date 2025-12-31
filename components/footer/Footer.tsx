"use client";

export default function Footer() {
  return (
    <footer className="bg-base-100 border-t border-base-200 py-4 w-full">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-accent-content">
          <div className="mb-2 md:mb-0">
            <p>&copy; {new Date().getFullYear()} 远路播客. 保留所有权利。</p>
          </div>
          <div className="hidden xl:flex flex-wrap text-neutral-content justify-center gap-4">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-content transition-colors"
            >
              滇ICP备2023001663号
            </a>
            <a
              href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=53032202530362"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-content transition-colors"
            >
              滇公网安备 53032202530362号
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
