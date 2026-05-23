import { User } from "@/core/user/user.entity";

export default async function UserPermissionInfo({ user }: { user: User }) {
  const currentSubscription = user.subscriptions?.[0] ?? null;
  const isSubscriptionActive =
    currentSubscription?.endDate &&
    new Date(currentSubscription.endDate) > new Date();

  // Calculate remaining days for active subscriptions
  const remainingDays = isSubscriptionActive
    ? Math.ceil(
        (new Date(currentSubscription.endDate!).getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-6">
        <div className="flex flex-col items-start justify-start space-y-4">
          <h2 className="text-lg font-bold text-slate-500">当前用户权限信息</h2>
          <ul className="space-y-3 pl-4 text-slate-400">
            <li>用户账号：{user.email}</li>
            <li>
              用户角色：
              <span
                className={
                  user.role === "ADMIN"
                    ? "text-red-500 font-semibold"
                    : user.role === "PREMIUM"
                      ? "text-amber-500 font-semibold"
                      : ""
                }
              >
                {user.role}
              </span>
            </li>
            <li>
              登录权限：{(user.isLoginAllowed ?? true) ? "允许" : "已禁止"}
            </li>
            <li>评论权限：{user.isCommentAllowed ? "允许" : "已禁止"}</li>

            {/* PREMIUM subscription status */}
            {currentSubscription && (
              <li className="flex items-center gap-2">
                高级会员订阅：
                {isSubscriptionActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-0.5 text-xs font-medium text-green-700">
                    ✓ 有效（剩余 {remainingDays} 天，至{" "}
                    {new Date(currentSubscription.endDate!).toLocaleDateString(
                      "zh-CN",
                    )}
                    ）
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-0.5 text-xs font-medium text-red-600">
                    ✗ 已过期（
                    {currentSubscription.endDate
                      ? new Date(
                          currentSubscription.endDate,
                        ).toLocaleDateString("zh-CN")
                      : "未设置"}
                    ）
                  </span>
                )}
              </li>
            )}
            {!currentSubscription && user.role !== "ADMIN" && (
              <li className="text-slate-300">高级会员订阅：无订阅记录</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
