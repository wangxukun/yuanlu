"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";
import {
  EnvelopeIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface BindEmailFormProps {
  onSuccess?: () => void;
}

export default function BindEmailForm({ onSuccess }: BindEmailFormProps) {
  const { update: updateSession } = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [bound, setBound] = useState(false);
  const [boundEmail, setBoundEmail] = useState("");

  // Password criteria (real-time)
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

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Send verification code to email
  const handleSendCode = async () => {
    if (!isEmailValid) {
      setError("请输入有效的邮箱地址");
      return;
    }

    try {
      setError("");
      const response = await fetch("/api/auth/bind-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "发送失败");
      }

      setCodeSent(true);
      setCountdown(60);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "验证码发送失败，请重试";
      setError(message);
    }
  };

  // Submit binding
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

    if (!code) {
      setError("请输入验证码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/bind-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "绑定失败");
      }

      // Binding successful
      setBound(true);
      setBoundEmail(email);

      // Refresh session to include new email info
      await updateSession({
        user: {
          email,
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

  // Show success state
  if (bound) {
    return (
      <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl border border-success/20">
        <CheckCircleIcon className="w-6 h-6 text-success flex-shrink-0" />
        <div>
          <p className="font-semibold text-success">绑定成功</p>
          <p className="text-sm text-base-content/70 mt-0.5">
            邮箱：{boundEmail} <span className="ml-2">已验证 ✓</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="flex items-center gap-2 text-error bg-error/10 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email input + send code */}
      <div className="form-control">
        <div className="join w-full shadow-sm">
          <div className="relative w-full join-item">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20 text-base-content/40">
              <EnvelopeIcon className="h-5 w-5" />
            </div>
            <input
              type="email"
              placeholder="请输入邮箱地址"
              className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary focus:z-10 transition-all h-12"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              required
            />
          </div>
          <button
            type="button"
            onClick={handleSendCode}
            className={`btn border-none join-item w-[110px] h-12 font-normal text-white transition-all ${
              countdown > 0 || !isEmailValid
                ? "btn-disabled bg-base-300 text-base-content/30"
                : "bg-primary-600 hover:bg-primary-700"
            }`}
            disabled={countdown > 0 || !isEmailValid || loading}
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

      {/* Verification Code */}
      <div className="form-control">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="6位邮箱验证码"
            className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError("");
            }}
            disabled={loading}
            required
          />
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
            placeholder="设置登录密码"
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
            placeholder="确认登录密码"
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
            !isPasswordValid ||
            !isConfirmPasswordMatch ||
            !code ||
            code.length !== 6
          }
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "确认绑定"
          )}
        </button>
      </div>
    </form>
  );
}
