import {
  BanknotesIcon,
  ClockIcon,
  UserGroupIcon,
  InboxIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline";
import { lusitana } from "@/components/fonts";
import { fetchOnlineUsers } from "@/lib/data";
import { statsService } from "@/core/stats/stats.service";

const iconMap = {
  onlineUser: BanknotesIcon,
  registrationUser: UserGroupIcon,
  vip: ClockIcon,
  audios: InboxIcon,
  podcast: MicrophoneIcon,
};

export default async function CardWrapper() {
  const [
    { numberOfOnlineUsers },
    { podcastCount, episodeCount },
    { totalUsers, vipUsers },
  ] = await Promise.all([
    fetchOnlineUsers(),
    statsService.getGlobalContentStats(),
    statsService.getGlobalUserStats(),
  ]);

  return (
    <>
      <Card title="播客合计" value={podcastCount} type="podcast" />
      <Card title="音频合计" value={episodeCount} type="audios" />
      <Card title="在线人数" value={numberOfOnlineUsers} type="onlineUser" />
      <Card title="注册人数" value={totalUsers} type="registrationUser" />
      <Card title="会员人数" value={vipUsers} type="vip" />
    </>
  );
}

export function Card({
  title,
  value,
  type,
}: {
  title: string;
  value: number | string;
  type: "onlineUser" | "registrationUser" | "vip" | "audios" | "podcast";
}) {
  const Icon = iconMap[type];

  return (
    <div className="rounded-xl bg-gray-50 p-2 shadow-xs">
      <div className="flex p-4">
        {Icon ? <Icon className="h-5 w-5 text-gray-700" /> : null}
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <p
        className={`${lusitana.className}
          truncate rounded-xl bg-white px-4 py-8 text-center text-2xl`}
      >
        {value}
      </p>
    </div>
  );
}
