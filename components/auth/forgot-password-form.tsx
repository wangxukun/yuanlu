"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ArrowUturnLeftIcon,
  UserIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";

export default function ForgotPasswordForm() {
  const checkedEmail = useAuthStore((state) => state.checkedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Password criteria (real-time verification)
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

  // Verification code countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onBack = () => {
    const signInModal = (document.getElementById("my_modal_login") ||
      document.getElementById("sign_in_modal_box")) as HTMLDialogElement;

    const currentModal = document.getElementById(
      "forgot_password_modal_box",
    ) as HTMLDialogElement;

    if (signInModal && currentModal) {
      setPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setError("");
      setCodeSent(false);
      currentModal.close();
      signInModal.showModal();
    }
  };

  // Send validation email
  const handleSendCode = async () => {
    if (!checkedEmail) {
      setError("邮箱地址缺失，请返回重试");
      return;
    }

    try {
      setError("");
      const response = await fetch("/api/auth/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "发送失败，请确认您的邮箱是否已注册");
      }

      setCodeSent(true);
      setCountdown(60);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "验证码发送失败，请重试";
      setError(message);
    }
  };

  // Submit password reset
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

    if (!verificationCode) {
      setError("请输入验证码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkedEmail,
          code: verificationCode,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "重置密码失败，请重试");
      }

      // Show success toast on screen
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

      // Close reset password modal
      const currentModal = document.getElementById(
        "forgot_password_modal_box",
      ) as HTMLDialogElement;
      if (currentModal) currentModal.close();

      // Clear state
      setPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setCodeSent(false);

      // Back to sign in modal
      const signInModal = (document.getElementById("my_modal_login") ||
        document.getElementById("sign_in_modal_box")) as HTMLDialogElement;
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
    <div className="w-full">
      {/* Target User Info Header */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="avatar placeholder mb-2">
          <div className="bg-base-200 text-primary rounded-full w-16 h-16 ring ring-primary ring-offset-base-100 ring-offset-2 grid place-items-center">
            <UserIcon className="mt-4 block w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-base-content/50 mb-0.5">重置密码的邮箱</p>
          <p className="font-semibold text-base-content tracking-tight">
            {checkedEmail}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        suppressHydrationWarning
      >
        {/* Verification Code Input */}
        <div className="form-control">
          <div className="join w-full shadow-sm">
            <div className="relative w-full join-item">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20 text-base-content/40">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <input
                suppressHydrationWarning
                type="text"
                className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary focus:z-10 transition-all h-12 text-base"
                placeholder="6位验证码"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  if (error) setError("");
                }}
                required
              />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              className={`btn join-item w-[110px] h-12 font-normal text-white transition-all ${
                countdown > 0
                  ? "btn-disabled bg-base-300 text-base-content/30"
                  : "btn-primary shadow-lg shadow-primary/20"
              }`}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </button>
          </div>
          {codeSent && !error && (
            <span className="text-success text-xs mt-1.5 block ml-1 animate-in fade-in">
              验证码已发送，请检查您的邮箱
            </span>
          )}
        </div>

        {/* New Password Input */}
        <div className="form-control space-y-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              suppressHydrationWarning
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 text-base shadow-sm ${
                password && !isPasswordValid ? "input-warning" : ""
              } ${isPasswordValid ? "input-success" : ""}`}
              placeholder="请设置新密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              required
            />
          </div>

          {/* Password complexity checklist */}
          <div className="grid grid-cols-3 gap-2 px-1 py-1">
            <RequirementItem met={passwordCriteria.length} text="8位以上" />
            <RequirementItem met={passwordCriteria.hasLetter} text="包含字母" />
            <RequirementItem met={passwordCriteria.hasNumber} text="包含数字" />
          </div>
        </div>

        {/* Confirm Password Input */}
        <div className="form-control">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              suppressHydrationWarning
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 text-base shadow-sm ${
                confirmPassword && !isConfirmPasswordMatch ? "input-error" : ""
              } ${isConfirmPasswordMatch ? "input-success" : ""}`}
              placeholder="请再次确认新密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
              }}
              required
            />
          </div>
          {confirmPassword && !isConfirmPasswordMatch && (
            <span className="text-error text-xs mt-1.5 block ml-1 animate-in fade-in">
              两次输入的密码不一致
            </span>
          )}
        </div>

        {/* Display Error Message */}
        <div className="h-6 flex items-center">
          {error && (
            <div className="flex items-center gap-1.5 text-error text-sm animate-in slide-in-from-top-1 fade-in">
              <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={onBack}
            className="btn btn-outline col-span-1 border-base-300 text-base-content/70 hover:bg-base-200 hover:border-base-300 hover:text-base-content rounded-xl h-11 min-h-0 font-normal transition-all"
            type="button"
            disabled={loading}
          >
            <ArrowUturnLeftIcon className="w-4 h-4 mr-1" />
            返回
          </button>

          <button
            type="submit"
            className="btn btn-primary col-span-2 rounded-xl h-11 min-h-0 text-base font-semibold shadow-primary/20 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-white"
            disabled={
              loading ||
              !isPasswordValid ||
              !isConfirmPasswordMatch ||
              !verificationCode
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
    </div>
  );
}
