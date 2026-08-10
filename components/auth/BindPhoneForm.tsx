"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import CaptchaModal from "./captcha-modal";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";
import {
  DevicePhoneMobileIcon,
  KeyIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface BindPhoneFormProps {
  onSuccess?: () => void;
}

export default function BindPhoneForm({ onSuccess }: BindPhoneFormProps) {
  const { update: updateSession } = useSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [bound, setBound] = useState(false);
  const [boundPhone, setBoundPhone] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendSmsCode = async (captchaData?: Record<string, unknown>) => {
    setError("");
    setSuccessMsg("");

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的11位手机号码");
      return;
    }

    try {
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          scene: "BIND",
          captchaData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg("验证码发送成功");
        setCountdown(60);
      } else if (data.requireCaptcha) {
        setShowCaptcha(true);
      } else {
        setError(data.error || "发送失败");
      }
    } catch {
      setError("网络错误，请重试");
    }
  };

  const onCaptchaSuccess = (captchaData: Record<string, unknown>) => {
    setShowCaptcha(false);
    sendSmsCode(captchaData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sms/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "绑定失败");
      }

      // Binding successful
      setBound(true);
      setBoundPhone(phone);

      // Refresh session to include new phone info
      await updateSession({
        user: {
          phone,
          phoneVerified: true,
        },
      });

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "绑定失败，请重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Show success state
  if (bound) {
    const maskedPhone = boundPhone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
    return (
      <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl border border-success/20">
        <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0" />
        <div>
          <p className="font-semibold text-success">绑定成功</p>
          <p className="text-sm text-base-content/70 mt-0.5">
            手机号：{maskedPhone} <span className="ml-2">已验证 ✓</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-center gap-2 text-error bg-error/10 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
            <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && !error && (
          <div className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Phone input */}
        <div className="form-control">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <DevicePhoneMobileIcon className="h-5 w-5" />
            </div>
            <input
              type="tel"
              ref={inputRef}
              placeholder="请输入11位手机号码"
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 ${
                error && !phone ? "input-error" : ""
              }`}
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Verification code + send button */}
        <div className="form-control">
          <div className="join w-full shadow-sm">
            <div className="relative w-full join-item">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20 text-base-content/40">
                <KeyIcon className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="输入6位验证码"
                className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary focus:z-10 transition-all h-12 ${
                  error && !code ? "input-error" : ""
                }`}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={loading}
                required
              />
            </div>
            <button
              type="button"
              className={`btn border-none join-item w-[110px] h-12 font-normal text-white transition-all ${
                phone.length !== 11 || loading
                  ? "btn-disabled bg-base-300 text-base-content/30"
                  : "bg-primary-600 hover:bg-primary-700"
              }`}
              disabled={countdown > 0 || phone.length !== 11 || loading}
              onClick={() => sendSmsCode()}
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !phone || !code || code.length !== 6}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "确认绑定"
            )}
          </button>
        </div>
      </form>

      {showCaptcha && (
        <CaptchaModal
          onSuccess={onCaptchaSuccess}
          onClose={() => setShowCaptcha(false)}
        />
      )}
    </>
  );
}
