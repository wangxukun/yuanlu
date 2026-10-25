// components/auth/signup-source-select.tsx — 注册来源下拉（T3 网页通道）
//
// 与小程序端 scene/src 自动归因互补：网页无法可靠捕获入口来源，用自报式下拉。
// 值须匹配后端 core/utils/signup-source.ts 的正则 ^[A-Za-z0-9_.\-]{1,100}$，
// web_ 前缀与小程序的 gzh_* 命名空间区分；仅建号时落库，登录不覆盖。

export const SIGNUP_SOURCE_OPTIONS = [
  { value: "web_bilibili", label: "B 站" },
  { value: "web_xiaohongshu", label: "小红书" },
  { value: "web_douyin", label: "抖音" },
  { value: "web_gzh", label: "微信公众号" },
  { value: "web_sph", label: "微信视频号" },
  { value: "web_weapp", label: "微信小程序" },
  { value: "web_search", label: "搜索引擎" },
  { value: "web_friend", label: "朋友推荐" },
  { value: "web_other", label: "其他" },
];

export default function SignupSourceSelect({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  /** 补充说明（如"仅首次注册时记录"），随场景定制 */
  hint?: string;
}) {
  return (
    <div className="form-control">
      <label className="label py-1">
        <span className="label-text text-xs text-base-content/60">
          最早从哪里知道我们？（可选{hint ? `，${hint}` : ""}）
        </span>
      </label>
      <select
        suppressHydrationWarning
        className="select select-bordered w-full bg-base-200/50 focus:bg-base-100 focus:border-primary-600 dark:focus:border-primary-400 h-12 rounded-xl font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">请选择（可不选）</option>
        {SIGNUP_SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
