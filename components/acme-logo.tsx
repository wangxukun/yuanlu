import Image from "next/image";
import { lusitana } from "@/components/fonts";

export default function AcmeLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center leading-none text-gray-600`}
    >
      <div className="flex items-center space-x-4">
        <Image
          src="/static/images/logo.png"
          alt="远路播客 Logo"
          width={80}
          height={80}
          className="rounded-full"
        />
        <span className="text-base text-slate-500 font-bold leading-tight">
          远路播客
        </span>
      </div>
    </div>
  );
}
