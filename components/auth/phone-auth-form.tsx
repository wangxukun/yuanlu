"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthError } from "next-auth";
import { phoneSignInSchema } from "@/lib/form-schema";
import CaptchaModal from "./captcha-modal";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { DevicePhoneMobileIcon, KeyIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function PhoneAuthForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [countdown, setCountdown] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const router = useRouter();
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
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendSmsCode = async (captchaData?: any) => {
    setError("");
    setSuccessMsg("");

    const result = phoneSignInSchema.pick({ phone: true }).safeParse({ phone });
    if (!result.success) {
      setError(result.error.errors[0]?.message || "请输入有效的手机号码");
      return;
    }

    try {
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          scene: "LOGIN",
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
    } catch (err) {
      setError("网络错误，请重试");
    }
  };

  const onCaptchaSuccess = (captchaData: any) => {
    setShowCaptcha(false);
    sendSmsCode(captchaData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    setError("");

    const result = phoneSignInSchema.safeParse({ phone, code });
    if (!result.success) {
      setError(result.error.errors[0]?.message || "格式错误");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        phone,
        code,
      });

      console.log("NextAuth signIn response:", res);

      if (res?.error) {
        // Read custom error from side-channel cookie if present
        let errorMsg = res.error === "CredentialsSignin" ? "验证码错误或已过期" : res.error;
        const match = document.cookie.match(new RegExp('(^| )custom_auth_error=([^;]+)'));
        if (match) {
          errorMsg = decodeURIComponent(match[2]);
          document.cookie = "custom_auth_error=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (res?.ok) {
        const modal = document.getElementById("email_check_modal_box") as HTMLDialogElement;
        if (modal) modal.close();
        router.refresh();
      }
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("发生了未知的错误，请重试");
      }
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

        <div className="form-control">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <DevicePhoneMobileIcon className="h-5 w-5" />
            </div>
            <input
              type="tel"
              ref={inputRef}
              placeholder="请输入11位手机号码"
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 ${error && !phone ? "input-error" : ""
                }`}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="form-control">
          <div className="join w-full shadow-sm">
            <div className="relative w-full join-item">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20 text-base-content/40">
                <KeyIcon className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="恒创联众：输入6位验证码"
                className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary focus:z-10 transition-all h-12 ${error && !code ? "input-error" : ""
                  }`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                required
              />
            </div>
            <button
              type="button"
              className={`btn border-none join-item w-[110px] h-12 font-normal text-white transition-all ${phone.length !== 11 || loading
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

        {/* 协议复选框 */}
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3 py-0">
            <input
              suppressHydrationWarning
              type="checkbox"
              className="checkbox checkbox-sm rounded-md border-base-content/50 checked:bg-primary-400 checked:border-primary-400 transition-colors"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="label-text text-xs text-base-content/70">
              我已阅读并同意
              <a
                href="/auth/user-agreement"
                target="_blank"
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline mx-1 transition-colors"
              >
                用户协议
              </a>
              和
              <a
                href="/auth/privacy-policy"
                target="_blank"
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline mx-1 transition-colors"
              >
                隐私政策
              </a>
            </span>
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !phone || !code || !agreed}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <span>登录 / 注册</span>
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </>
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
