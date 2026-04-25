// yuanlu/app/(main)/discover/page.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import {
  getTrendingPodcasts,
  getRecommendedChannels,
} from "@/lib/discover-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "发现 | 远路播客",
  description: "探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。",
};

export default async function DiscoverPage() {
  const [trendingPodcasts, recommendedChannels] = await Promise.all([
    getTrendingPodcasts(),
    getRecommendedChannels(),
  ]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 pb-24">
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Hot Programs Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-2xl font-bold text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              热门节目
            </h2>
            <Link
              href="/discover/trending"
              className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
            >
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingPodcasts.slice(0, 3).map((podcast, index) => {
              const rankColors = [
                "bg-[#FFD700] text-white", // 01 Gold
                "bg-[#C0C0C0] text-white", // 02 Silver
                "bg-[#CD7F32] text-white", // 03 Bronze
              ];
              return (
                <Link
                  href={`/podcast/${podcast.podcastid}`}
                  key={podcast.podcastid}
                >
                  <div className="rounded-[1rem] transition-shadow group cursor-pointer relative">
                    <div
                      className={`absolute top-2 left-2 z-10 ${rankColors[index]} w-8 h-8 rounded-full flex items-center justify-center font-black text-sm italic shadow-sm`}
                    >
                      0{index + 1}
                    </div>
                    <div className="aspect-square rounded-[1rem] overflow-hidden mb-4 relative">
                      <Image
                        src={podcast.coverUrl}
                        alt={podcast.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      热门趋势
                    </p>
                    <h3
                      className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 truncate group-hover:text-indigo-600 transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {podcast.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          headphones
                        </span>
                        {(podcast.totalPlays / 1000).toFixed(1)}k 收听者
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 为你推荐 (For You) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-2xl font-bold text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              为你推荐
            </h2>
            <a
              className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
              href="#"
            >
              查看全部
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Recommendation Card 1 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <img
                  alt="播客"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCj4cwX292bASk3zVjfcEot_88jv9OBgi5WhBdKGtvgyIYSBjIJisRMyA9xRg3PEaMal6gnPAZ9UQdZUy-8O62QmhUDgkHFbtS4fHMu1DDorSN2ZIpvLefE-ejkL_ACaWZ3xhCvUOtwS4GRP5nyr3EWWfPS_EJnHjQ-NXAiqWpcxR81Kovik1olK8BkEJCxIioVBAJRKQS-HUIhOjyrYa8kEzNL7GjDzxdc0bjIUh0SMQDFh9ozMPjk7ozytHzF6zpc1h01yvCpM9i4"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <span
                      className="material-symbols-outlined text-indigo-600 text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                  远路工作室
                </p>
                <h3
                  className="font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 transition-colors"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  数字游民的灵魂
                </h3>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                  <span>48 剧集</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span>12.5k 播放</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    心理学
                  </span>
                </div>
              </div>
            </div>
            {/* Recommendation Card 2 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <img
                  alt="播客"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVGjYL3oACzPPE8LVe3NOfQgDMZDH4wvV5-8HxmZ2qa8qFKNMQIRiDjwMauBluO_U-H1w5SuDzS7rXBwg8vulaaWo2C8XskAEaEJ6bt82S2CzZ37LWULoimiXd4YU3SmEebo7IjsnLR5pv3DGGRWLOXthZkqu7yQ829irbvDnb_RVHBjv29Ig_vmFnRtfXP_6bV3HbGw-0oGeEHGvoIzKz6U3IQuIhVccZhDWAplIegHOFqT01O96knszInU-coT9Lhbc1hcpkxetE"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <span
                      className="material-symbols-outlined text-indigo-600 text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                  午夜电台
                </p>
                <h3
                  className="font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 transition-colors"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  午夜谈话
                </h3>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                  <span>124 剧集</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span>85.2k 播放</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    情感
                  </span>
                </div>
              </div>
            </div>
            {/* Recommendation Card 3 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <img
                  alt="播客"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7UpIhMrmmUipmZwuu6Jnu0cIA5qmLKV2CoIoxC8g8EATh2dbPhgcjsV7bbGdcvSfRFTXIZ3hiEVKTgEXB3YA5I5E0GFT09ykOVjeo38JT2PC5i_3nPML0fYcNT2sVFMt2xcw-KCXYyABrIJPOIWAiWCgML-zhwzmC1uIaTB3SyCFx0mKOfcAJ7V1XN5DhNBqpRHBjwdhOanY2aToSbqfmUZihlOiRBLglBArZB9oDC1iQ4JiWCEpKa9J446G5CpDMCFroIbW46il_"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <span
                      className="material-symbols-outlined text-indigo-600 text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                  创意中心
                </p>
                <h3
                  className="font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 transition-colors"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  心流与创造力瓶颈
                </h3>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                  <span>312 剧集</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span>240k 播放</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    教育
                  </span>
                </div>
              </div>
            </div>
            {/* Recommendation Card 4 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <img
                  alt="播客"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjcXewg-4iG-RJmcZKVnr9qHWuq2gIggaFE2oh1sGUYgb5BzB2QNpScNqqVQsXnN5utz75bT3rMzGEDuSK4ifigY__AXzT5OlOt3NqOkVJhRMg1_JdavtLvknwjmrAfqbi56dyB8vjkYmw7c-MYc5GvxNPgUTBHu6RLQIW9h0B1T9_SdfPyNwiBAu7t4lX1kHYhP8grwggWscyU337__PoT6nPNG2G8lzThDcd14tR4sndpAR2r5YXOGWUfkEYtgwcd7oRHnokPPps"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <span
                      className="material-symbols-outlined text-indigo-600 text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                  科学周刊
                </p>
                <h3
                  className="font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 transition-colors"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  未来科技伦理
                </h3>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                  <span>15 剧集</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span>620k 播放</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    文化
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 新节目 (New Programs) */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                新节目
              </h2>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="flex gap-8 overflow-x-auto scrollbar-none pb-4 -mx-6 px-6 lg:mx-0 lg:px-0">
            {/* New Program Card 1 */}
            <div className="flex-none w-64 group">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4">
                <img
                  alt="节目封面"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCesZN2k0c-yVLiaP16ouIsUXqj7RswdE93e1Jjxf322b6HOZYG5HToHzTf-R2floPP97LejbgklpKWdn41-pJsz-6OqszVq7hi9do_dJ45ujL65iGzX-Hld63jIA2EidPKzefh01HaE4vCQNLX_551OcrySNNcXvZZEqzWTvKp2eCuhI5OKiGhP4MJ4sUq8JVIrPfxvdRL6Ljt39pHnvP2sdRweU1cGNXnI6DlaEjSwWp6NcOG7n32b4hoUbmafZ9fWBq-Jn3eUD84"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  新作
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                现代智慧
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                静止的哲学
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">12 集</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  社会
                </span>
              </div>
            </div>
            {/* New Program Card 2 */}
            <div className="flex-none w-64 group">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4">
                <img
                  alt="节目封面"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGC6wBttUlXOKx-EuvmLsxHC96eCZ9_ch1pO70JYwMX_yRBA5VltByMeUT3ULv3VeuRj4O7UO1rxGo_TRs0CJssGKpmNWGDBF9qNT19ZaUogU_AvOCcMGEYg8CfLHtJ_X8t9HyCWh94bciCaaXpkwxiYek5o0mHRmqupSPd81SkMACvPf99QTssMpfrwtk2CWp0l4OCsMIqA9fvhFSPYl1J5F9jBx0Bc2r0go43EsMRghwn-Gka5iyshZ_dyZNsNyLpYk8RjcIH0N5"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  新作
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                声音档案馆
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                爵士仪式
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">8 集</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  音乐
                </span>
              </div>
            </div>
            {/* New Program Card 3 */}
            <div className="flex-none w-64 group">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4">
                <img
                  alt="节目封面"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAD5qG3CxvGNxBZlynRcVYaC9ZHHesQQnlQ_jfpGif9BWztmBXPBc1CJ-z4EKKAxa7VBh9NmP3n1O-P_PKQJ9R56Lh2z-qDoJ9kCrBsahUyM6r--adtqpTsNk5XvFv88asagqZhT_UWar3LORcj4GbfOKPn9_a0q9BxdUPk7lzEvmJJO_aeTn1I2cOJDBoxC_M1lK_UHWlFaBBYbJ_2o93-j8sa1hvsTw9m1BI5VNv7rw_RCeHTlCnt_KsHTpdXeD6QDyI3YVzbxjXX"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  新作
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                轨道视角
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                火星编年史
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">24 集</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  科学
                </span>
              </div>
            </div>
            {/* New Program Card 4 */}
            <div className="flex-none w-64 group">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4">
                <img
                  alt="节目封面"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoFkFwlR_nsJ1pcb0zQ96INCSUYNfzGhdld-wLXp-g4Ea3Qt3fJ__Kx11sXT0E7oqeUSbWRMQmqIFRdsosPYAi4xF45EhYXejEktqJVrQ0m2_DZca14g0-Ic_8CSS0qRMIsAxkF0_6X4AynM7ORZtVnRfJiM1oy_TLaJs62ivu0nViQb3ghLg8dKM5qDtNAKCLYd4Gbp8o-lpgH6sHhQx4nPZCofN1SIM5hiV3PJeAzT3ENSPrZu1RCexgfM8rnXEnxA_KBqiYh77T"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  新作
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                文学评论
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                未竟之诗
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">15 集</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  文学
                </span>
              </div>
            </div>
            {/* New Program Card 5 */}
            <div className="flex-none w-64 group">
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4">
                <img
                  alt="节目封面"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD13JkURJfPF5DXXvBGdVWQIFDL5B-9rAhY49TjaA6ukBwrNvFGCW4DNNcnXPYhWCnP-QnH389kPaXZI8weTdAh8zKVq1jh2koJwiph2DsiTLdnagoTC43MEIG3OZWfCUjz62XL2IjaGYIZYuDY_l_wYY0GUVCfccUecwEzP7O0X3UjDFkqchDqh9X4P0Air4ZFWC1uoD-C2EVHau0iExV4lOSNiL6EEBsMAmGQ8oe1DOfD5UZ73cDgvFKqqrBsZYw1DJUKDAHRbO3V"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  新作
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                味蕾旅行
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                丝路香料考
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">9 集</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  文化
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 推荐频道 (Recommended Channels) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-2xl font-bold text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              推荐频道
            </h2>
            <Link
              href="/discover/channels"
              className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
            >
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedChannels.slice(0, 4).map((channel) => (
              <Link
                href={`/channel/${encodeURIComponent(channel.name)}`}
                key={channel.name}
              >
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[24px] hover:scale-[1.02] transition-all duration-300 group flex flex-col items-center text-center border border-indigo-100 dark:border-indigo-800/30 h-full">
                  <h3
                    className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {channel.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
                    {channel.podcastCount} 剧集
                  </p>
                  <button className="mt-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 px-6 py-3 rounded-full font-bold text-sm hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white hover:shadow-md transition-all w-full">
                    <span className="material-symbols-outlined text-lg">
                      computer
                    </span>
                    <span>频道主页</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
