import React from "react";

export interface JourneyDay {
  label: string; // 周一 … 周日
  minutes: number; // 当日学习分钟数
  isToday: boolean;
}

interface StripProps {
  days: JourneyDay[];
  W: number;
  H: number;
  pad: number;
  r: number;
  font: number;
}

/** 单条路径渲染（参数化，供移动/桌面两套尺寸复用） */
function Strip({ days, W, H, pad, r, font }: StripProps) {
  const xs = days.map((_, i) => pad + (i * (W - pad * 2)) / (days.length - 1));
  // 轻微起伏的路径，营造"路"的感觉（相对 H 定位）
  const base = H * 0.56;
  const amp = H * 0.09;
  const ys = [
    base + amp,
    base - amp,
    base + amp * 0.8,
    base - amp,
    base + amp * 0.7,
    base - amp * 0.9,
    base + amp,
  ];

  // 经过各节点的平滑曲线（Q 段过中点）
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2;
    const my = (ys[i - 1] + ys[i]) / 2;
    d += ` Q${xs[i - 1]},${ys[i - 1]} ${mx},${my}`;
  }
  d += ` L${xs[xs.length - 1]},${ys[ys.length - 1]}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="本周学习路径"
    >
      {/* 小径 */}
      <path
        d={d}
        fill="none"
        stroke="var(--ink-200)"
        strokeWidth="2.5"
        strokeDasharray="0.1 9"
        strokeLinecap="round"
      />

      {days.map((day, i) => {
        const studied = day.minutes > 0;
        const x = xs[i];
        const y = ys[i];
        return (
          <g key={day.label} transform={`translate(${x},${y})`}>
            <title>{`${day.label} · ${day.minutes > 0 ? `${day.minutes} 分钟` : "未学习"}`}</title>

            {/* 今天：虚线提醒圈 */}
            {day.isToday && (
              <circle
                r={r + 6}
                fill="none"
                stroke="var(--accent-400)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}

            {/* 节点 */}
            <circle
              r={r}
              className={
                studied ? "fill-primary-500" : "fill-white dark:fill-ink-800"
              }
              stroke={studied ? "none" : "var(--ink-300)"}
              strokeWidth="1.5"
            />

            {/* 里程碑小旗 */}
            {studied && (
              <path
                d={`M0,${-r} L0,${-r - 13} L11,${-r - 9.5} L0,${-r - 6} Z`}
                fill="var(--accent-500)"
              />
            )}

            {/* 日标签 */}
            <text
              y={r + font + 8}
              textAnchor="middle"
              fontSize={font}
              fill={day.isToday ? "var(--accent-700)" : "var(--ink-400)"}
              fontWeight={day.isToday ? 700 : 400}
            >
              {day.isToday ? "今天" : day.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 我的路 —— 品牌核心组件
 * 一条蜿蜒的虚线小径，7 个节点代表一周 7 天；
 * 学习过的日子点亮远青节点并插上曙光橙小旗，今天用虚线圈标记。
 * 移动端使用窄 viewBox 以保证节点物理尺寸可读。
 */
export default function JourneyStrip({ days }: { days: JourneyDay[] }) {
  return (
    <>
      {/* 移动端：360 宽画幅，节点约 12px 直径 */}
      <div className="sm:hidden">
        <Strip days={days} W={360} H={92} pad={30} r={6} font={12} />
      </div>
      {/* 平板/桌面：限宽居中，避免过度拉伸 */}
      <div className="hidden sm:block max-w-3xl mx-auto">
        <Strip days={days} W={700} H={92} pad={46} r={7} font={13} />
      </div>
    </>
  );
}
