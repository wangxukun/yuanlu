import Image from "next/image";

export default function AcmeLogo() {
  return (
    <div>
      <div className="flex items-center space-x-4">
        <Image
          src="/static/images/logo-podcasts.png"
          alt="远路播客 Logo"
          width={146}
          height={26}
        />
      </div>
    </div>
  );
}
