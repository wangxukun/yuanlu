"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import BindPhoneForm from "./BindPhoneForm";
import BindEmailForm from "./BindEmailForm";

export default function AccountSecurityTab() {
  const { data: session } = useSession();
  const [showBindPhone, setShowBindPhone] = useState(false);
  const [showBindEmail, setShowBindEmail] = useState(false);

  if (!session?.user) return null;

  const user = session.user;
  const hasPhone = !!user.phone;
  const isPlaceholderEmail = user.email?.endsWith("@placeholder.yuanlu.com");
  const hasRealEmail = !!user.email && !isPlaceholderEmail;

  // Mask phone: 138****8000
  const maskedPhone = user.phone
    ? user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
    : "";

  // Mask email: a***b@example.com
  const maskedEmail = hasRealEmail
    ? user.email!.replace(/^(.{1})(.*)(@.*)$/, (_, first, middle, domain) => {
        return first + "*".repeat(Math.min(middle.length, 4)) + domain;
      })
    : "";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Section: Phone */}
      <div className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 overflow-hidden shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h4 className="font-semibold text-ink-900 dark:text-ink-100 text-sm">
                手机号
              </h4>
              {hasPhone ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-ink-600 dark:text-ink-400">
                    {maskedPhone}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    已验证
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-ink-400">未绑定</span>
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-warning-500" />
                </div>
              )}
            </div>
          </div>
          {!hasPhone && !showBindPhone && (
            <button
              onClick={() => setShowBindPhone(true)}
              className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-xl transition-colors"
            >
              绑定手机号
            </button>
          )}
        </div>
        {!hasPhone && showBindPhone && (
          <div className="px-6 pb-5 border-t border-ink-100 dark:border-ink-800 pt-4">
            <BindPhoneForm onSuccess={() => setShowBindPhone(false)} />
          </div>
        )}
      </div>

      {/* Section: Email */}
      <div className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 overflow-hidden shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center">
              <EnvelopeIcon className="w-5 h-5 text-accent-500" />
            </div>
            <div>
              <h4 className="font-semibold text-ink-900 dark:text-ink-100 text-sm">
                邮箱
              </h4>
              {hasRealEmail ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-ink-600 dark:text-ink-400">
                    {maskedEmail}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    已验证
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-ink-400">未绑定</span>
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-warning-500" />
                </div>
              )}
            </div>
          </div>
          {!hasRealEmail && !showBindEmail && (
            <button
              onClick={() => setShowBindEmail(true)}
              className="px-4 py-2 text-sm font-medium text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/40 rounded-xl transition-colors"
            >
              绑定邮箱
            </button>
          )}
        </div>
        {!hasRealEmail && showBindEmail && (
          <div className="px-6 pb-5 border-t border-ink-100 dark:border-ink-800 pt-4">
            <BindEmailForm onSuccess={() => setShowBindEmail(false)} />
          </div>
        )}
      </div>

      {/* Section: Password */}
      <div className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 overflow-hidden shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/30 flex items-center justify-center">
              <LockClosedIcon className="w-5 h-5 text-secondary-500" />
            </div>
            <div>
              <h4 className="font-semibold text-ink-900 dark:text-ink-100 text-sm">
                登录密码
              </h4>
              {isPlaceholderEmail && !hasRealEmail ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-ink-400">未设置</span>
                  <span className="text-xs text-ink-400">
                    （绑定邮箱时将同时设置）
                  </span>
                </div>
              ) : (
                <span className="text-sm text-ink-600 dark:text-ink-400 mt-0.5 block">
                  已设置
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
