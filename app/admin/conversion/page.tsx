import {
  getConversionStats,
  getYearTrafficHeatmap,
} from "@/lib/actions/conversion-actions";
import ConversionClient from "./ConversionClient";

export default async function ConversionAnalyticsPage(props: {
  searchParams?: Promise<{ days?: string }>;
}) {
  const searchParams = await props.searchParams;
  const days = Number(searchParams?.days) || 30;

  // 获取数据（Server Action 内部处理管理员权限校验）；
  // 全年热力图为滚动 365 天窗口，与 days 筛选无关，并行取数
  const [stats, yearTraffic] = await Promise.all([
    getConversionStats(days),
    getYearTrafficHeatmap(),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-base-200/20">
      <ConversionClient stats={stats} yearTraffic={yearTraffic} />
    </div>
  );
}
