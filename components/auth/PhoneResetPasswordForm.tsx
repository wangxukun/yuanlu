"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import CaptchaModal from "./captcha-modal";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";
import {
  DevicePhoneMobileIcon,
  KeyIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function PhoneResetPasswordForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Password criteria
  const passwordCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
  const isConfirmPasswordMatch =
    password === confirmPassword && confirmPassword !== "";

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
          scene: "RESET_PASSWORD",
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

    if (!isPasswordValid) {
      setError("密码未达到强度要求");
      return;
    }

    if (!isConfirmPasswordMatch) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password/phone-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "重置密码失败，请重试");
      }

      // Show success toast
      const toast = document.createElement("div");
      toast.className =
        "toast toast-middle toast-center z-[100] animate-in fade-in zoom-in duration-200";
      toast.innerHTML = `
        <div class="alert alert-success shadow-xl rounded-2xl flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span class="text-white font-medium">密码重置成功！请用新密码登录</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      // Close forgot password modal
      const currentModal = document.getElementById(
        "forgot_password_modal_box",
      ) as HTMLDialogElement;
      if (currentModal) currentModal.close();

      // Clear state
      setPhone("");
      setCode("");
      setPassword("");
      setConfirmPassword("");

      // Back to sign in modal
      const signInModal = (document.getElementById("my_modal_login") ||
        document.getElementById("sign_in_modal_box") ||
        document.getElementById("email_check_modal_box")) as HTMLDialogElement;
      if (signInModal) {
        setTimeout(() => {
          signInModal.showModal();
        }, 300);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "重置密码出错，请重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div
      className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
        met ? "text-success" : "text-base-content/40"
      }`}
    >
      {met ? (
        <CheckCircleIcon className="w-3.5 h-3.5" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-current opacity-60" />
      )}
      <span>{text}</span>
    </div>
  );

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
              placeholder="请输入绑定的手机号码"
              className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12"
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
                className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary focus:z-10 transition-all h-12"
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

        {/* New Password */}
        <div className="form-control space-y-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 text-base shadow-sm ${
                password && !isPasswordValid ? "input-warning" : ""
              } ${isPasswordValid ? "input-success" : ""}`}
              placeholder="请设置新密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2 px-1 py-1">
            <RequirementItem met={passwordCriteria.length} text="8位以上" />
            <RequirementItem met={passwordCriteria.hasLetter} text="包含字母" />
            <RequirementItem met={passwordCriteria.hasNumber} text="包含数字" />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="form-control">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 text-base shadow-sm ${
                confirmPassword && !isConfirmPasswordMatch ? "input-error" : ""
              } ${isConfirmPasswordMatch ? "input-success" : ""}`}
              placeholder="请再次确认新密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              required
            />
          </div>
          {confirmPassword && !isConfirmPasswordMatch && (
            <span className="text-error text-xs mt-1.5 block ml-1 animate-in fade-in">
              两次输入的密码不一致
            </span>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              loading ||
              !phone ||
              !code ||
              code.length !== 6 ||
              !isPasswordValid ||
              !isConfirmPasswordMatch
            }
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm text-primary-content"></span>
            ) : (
              "确认重置"
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
