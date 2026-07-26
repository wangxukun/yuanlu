"use client";
import React, { useState } from "react";
import { CheckIcon, ClockIcon, StarIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { User } from "@/core/user/user.entity";

// Duration preset options for PREMIUM subscription
const PREMIUM_DURATION_OPTIONS = [
  { label: "7 天", value: 7 },
  { label: "1 个月", value: 30 },
  { label: "3 个月", value: 90 },
  { label: "6 个月", value: 180 },
  { label: "1 年", value: 365 },
] as const;

export default function UserPermissionForm({ user }: { user: User }) {
  const [isCommentAllowed, setIsCommentAllowed] = useState(
    user.isCommentAllowed,
  );
  const [isLoginAllowed, setIsLoginAllowed] = useState(
    user.isLoginAllowed ?? true,
  );
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [premiumDurationDays, setPremiumDurationDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = ["USER", "ADMIN", "PREMIUM"];

  // Determine current subscription status
  const currentSubscription = user.subscriptions?.[0] ?? null;
  const isSubscriptionActive =
    currentSubscription?.endDate &&
    new Date(currentSubscription.endDate) > new Date();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data: Record<string, unknown> = {
      userid: user.userid,
      role: selectedRole,
      isCommentAllowed: isCommentAllowed,
      isLoginAllowed: isLoginAllowed,
    };

    // Only include premiumDurationDays when setting role to PREMIUM
    if (selectedRole === "PREMIUM") {
      data.premiumDurationDays = premiumDurationDays;
    }

    try {
      const res = await fetch(`/api/user/setting`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.subscription) {
          const endDate = new Date(result.subscription.endDate);
          alert(
            `用户更新成功！PREMIUM 订阅有效期至 ${endDate.toLocaleDateString("zh-CN")}`,
          );
        } else {
          alert("用户更新成功！");
        }
        // Reload to refresh the displayed data
        window.location.reload();
      } else {
        const error = await res.json();
        console.error("User update failed:", error);
        alert(`用户更新失败: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("更新用户时发生错误，请重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 max-w-7xl mx-auto mt-6"
      >
        <div className="flex-1 rounded-lg bg-ink-50 px-6 pb-4 pt-8">
          <h2 className="text-lg font-bold text-ink-500">设置用户</h2>
          <div className="pl-4">
            <p className="text-sm text-ink-400 py-4">
              确定用户
              <span className="text-error-400">{user.email}</span>
              的角色，并设置用户是否允许评论。
            </p>

            <div className="flex flex-row items-center justify-start py-6 space-x-9">
              <label className="block text-sm font-medium text-ink-700">
                用户角色
              </label>
              <div className="min-w-64 bg-accent-100">
                <select
                  id="role"
                  name="role"
                  className="peer block w-full cursor-pointer rounded-md border border-ink-200 py-2 pl-10 text-sm outline-2 placeholder:text-ink-500"
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(
                      e.target.value as "USER" | "ADMIN" | "PREMIUM",
                    )
                  }
                  aria-describedby="customer-error"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PREMIUM subscription duration selector - shown only when PREMIUM is selected */}
            {selectedRole === "PREMIUM" && (
              <div
                className="rounded-lg border border-accent-200 bg-gradient-to-r from-accent-50 to-accent-50 p-5 mt-2 mb-4"
                style={{
                  animation: "fadeIn 0.3s ease-in-out",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <StarIcon className="h-5 w-5 text-accent-500" />
                  <h3 className="text-sm font-semibold text-accent-700">
                    高级会员订阅设置
                  </h3>
                </div>

                {/* Current subscription status */}
                {currentSubscription && (
                  <div className="mb-4 rounded-md bg-white/70 px-4 py-3 text-sm">
                    <p className="text-ink-600">
                      当前订阅状态：
                      {isSubscriptionActive ? (
                        <span className="inline-flex items-center gap-1 text-primary-600 font-medium">
                          <CheckIcon className="h-4 w-4" />
                          有效（至{" "}
                          {new Date(
                            currentSubscription.endDate!,
                          ).toLocaleDateString("zh-CN")}
                          ）
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-error-500 font-medium">
                          <ClockIcon className="h-4 w-4" />
                          已过期（
                          {currentSubscription.endDate
                            ? new Date(
                                currentSubscription.endDate,
                              ).toLocaleDateString("zh-CN")
                            : "未设置"}
                          ）
                        </span>
                      )}
                    </p>
                    {isSubscriptionActive && (
                      <p className="text-xs text-ink-400 mt-1">
                        提示：再次设置将在当前有效期基础上续期
                      </p>
                    )}
                  </div>
                )}

                {/* Duration selection */}
                <div className="flex flex-row items-center gap-4">
                  <label className="block text-sm font-medium text-accent-700 whitespace-nowrap">
                    订阅有效期
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PREMIUM_DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPremiumDurationDays(option.value)}
                        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                          premiumDurationDays === option.value
                            ? "bg-accent-500 text-white shadow-md scale-105"
                            : "bg-white text-ink-600 border border-ink-200 hover:border-accent-300 hover:text-accent-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <fieldset className="flex flex-row items-center justify-start space-x-9 mt-4">
              <label className="block text-sm font-medium text-ink-700">
                登录权限
              </label>
              <div className="rounded-md border border-ink-200 bg-white px-4 py-1">
                <div className="flex gap-9 min-w-48">
                  <div className="flex items-center">
                    <input
                      id="login-no"
                      name="login-status"
                      type="radio"
                      value="no"
                      checked={isLoginAllowed === false}
                      onChange={() => setIsLoginAllowed(false)}
                      className="text-white-600 h-4 w-4 cursor-pointer border-ink-300 bg-ink-100 focus:ring-2"
                    />
                    <label
                      htmlFor="login-no"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600"
                    >
                      禁止 <ClockIcon className="h-4 w-4" />
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="login-yes"
                      name="login-status"
                      type="radio"
                      checked={isLoginAllowed === true}
                      onChange={() => setIsLoginAllowed(true)}
                      value="yes"
                      className="h-4 w-4 cursor-pointer border-ink-300 bg-ink-100 text-ink-600 focus:ring-2"
                    />
                    <label
                      htmlFor="login-yes"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      允许 <CheckIcon className="h-4 w-4" />
                    </label>
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className="flex flex-row items-center justify-start space-x-9 mt-4">
              <label className="block text-sm font-medium text-ink-700">
                评论权限
              </label>
              <div className="rounded-md border border-ink-200 bg-white px-4 py-1">
                <div className="flex gap-9 min-w-48">
                  <div className="flex items-center">
                    <input
                      id="no"
                      name="status"
                      type="radio"
                      value="no"
                      checked={isCommentAllowed === false}
                      onChange={() => setIsCommentAllowed(false)}
                      className="text-white-600 h-4 w-4 cursor-pointer border-ink-300 bg-ink-100 focus:ring-2"
                    />
                    <label
                      htmlFor="no"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600"
                    >
                      禁止 <ClockIcon className="h-4 w-4" />
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="yes"
                      name="status"
                      type="radio"
                      checked={isCommentAllowed === true}
                      onChange={() => setIsCommentAllowed(true)}
                      value="yes"
                      className="h-4 w-4 cursor-pointer border-ink-300 bg-ink-100 text-ink-600 focus:ring-2"
                    />
                    <label
                      htmlFor="yes"
                      className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      允许 <CheckIcon className="h-4 w-4" />
                    </label>
                  </div>
                </div>
              </div>
            </fieldset>
            <Button
              type="submit"
              className="mt-6 w-24 justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </form>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
