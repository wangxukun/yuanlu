"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ArrowUturnLeftIcon,
  UserIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline"; // 引入新的图标用于反馈
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";

export default function SignUpForm() {
  const checkedEmail = useAuthStore((state) => state.checkedEmail);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCodeError, setVerificationCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 是否同意协议
  const [agreed, setAgreed] = useState(false);

  // 1. 密码安全要求状态 (实时计算)
  const passwordCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
    };
  }, [password]);

  // 密码是否完全合规
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  // 验证码倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onBack = () => {
    const emailCheckBox = document.getElementById(
      "email_check_modal_box",
    ) as HTMLDialogElement;

    const currentModal = (document.getElementById("my_modal_register") ||
      document.getElementById("sign_up_modal_box")) as HTMLDialogElement;

    if (emailCheckBox) {
      setPassword("");
      setVerificationCode("");
      setVerificationCodeError("");
      setCodeSent(false);
      if (currentModal) currentModal.close();
      emailCheckBox.showModal();
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    // 2. 只有密码合规才能发送
    if (!isPasswordValid) return;

    try {
      setVerificationCodeError("");
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail }),
      });

      const data = await response.json();
      if (!data.success) throw new Error("发送失败");

      setCodeSent(true);
      setCountdown(60);
    } catch (err) {
      console.log(err);
      setVerificationCodeError("验证码发送失败，请重试");
    }
  };

  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid || !agreed || !verificationCode) return;

    setLoading(true);
    try {
      // 验证验证码
      const verifyResponse = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail, code: verificationCode }),
      });
      const verifyData = await verifyResponse.json();

      if (verifyData.success === false) {
        setVerificationCodeError(verifyData.message || "验证码错误");
        setLoading(false);
        return;
      }

      // 创建用户
      const createResponse = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail, password }),
      });
      const createData = await createResponse.json();

      if (!createData.success) throw new Error(createData.message);

      // 成功后处理
      const modal = (document.getElementById("my_modal_register") ||
        document.getElementById("sign_up_modal_box")) as HTMLDialogElement;
      if (modal) modal.close();

      const toast = document.createElement("div");
      toast.className = "toast toast-middle toast-center z-50";
      toast.innerHTML = `
            <div class="alert alert-success shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>注册成功！请登录</span>
            </div>
        `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      const loginModal = (document.getElementById("my_modal_login") ||
        document.getElementById("sign_in_modal_box")) as HTMLDialogElement;
      if (loginModal) loginModal.showModal();
    } catch (err) {
      console.error(err);
      setVerificationCodeError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 辅助组件：密码要求项
  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div
      className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${met ? "text-success" : "text-base-content/40"}`}
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
      {/* 用户信息展示区 */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="avatar placeholder mb-2">
          <div className="bg-base-200 text-secondary rounded-full w-16 h-16 ring ring-secondary ring-offset-base-100 ring-offset-2 grid place-items-center">
            <UserIcon className="mt-4 block w-8 h-8" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium text-base-content">{checkedEmail}</p>
        </div>
      </div>

      <form
        suppressHydrationWarning
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* 密码输入 - 包含动态反馈 */}
        <div className="form-control">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-secondary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              suppressHydrationWarning
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-secondary transition-all rounded-xl h-12 
                ${password && !isPasswordValid ? "input-warning" : ""} 
                ${isPasswordValid ? "input-success" : ""}`}
              placeholder="设置登录密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* 1. 密码动态反馈区域 */}
          <div className="mt-2 grid grid-cols-3 gap-2 px-1">
            <RequirementItem met={passwordCriteria.length} text="8位以上" />
            <RequirementItem met={passwordCriteria.hasLetter} text="包含字母" />
            <RequirementItem met={passwordCriteria.hasNumber} text="包含数字" />
          </div>
        </div>

        {/* 验证码输入 */}
        <div className="form-control">
          <div className="join w-full shadow-sm">
            <div className="relative w-full join-item">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20 text-base-content/40">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <input
                suppressHydrationWarning
                type="text"
                className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-secondary focus:z-10 transition-all h-12 ${verificationCodeError ? "input-error" : ""}`}
                placeholder="6位验证码"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  if (verificationCodeError) setVerificationCodeError("");
                }}
                // 优化：虽然未点击发送前可以输入，但通常用户习惯是先点发送
              />
            </div>

            {/* 2. 获取验证码按钮控制：密码不合规时禁用 */}
            <button
              type="button"
              onClick={handleSendCode}
              className={`btn join-item w-[110px] h-12 font-normal text-white transition-all
                ${!isPasswordValid ? "btn-disabled bg-base-300 text-base-content/30" : "btn-secondary"}`}
              disabled={!isPasswordValid || countdown > 0}
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </button>
          </div>

          <div className="flex justify-between items-start mt-1 px-1 min-h-[20px]">
            <div className="flex-1">
              {verificationCodeError && (
                <span className="text-error text-xs flex items-center gap-1">
                  <ExclamationCircleIcon className="w-3 h-3" />{" "}
                  {verificationCodeError}
                </span>
              )}
              {codeSent && !verificationCodeError && (
                <span className="text-success text-xs">验证码已发送</span>
              )}
              {/* 提示用户先输密码 */}
              {!isPasswordValid && !verificationCodeError && (
                <span className="text-warning/80 text-xs">
                  请先设置合规的密码
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 协议复选框 */}
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3 py-0">
            <input
              suppressHydrationWarning
              type="checkbox"
              className="checkbox checkbox-sm checkbox-secondary rounded-md"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="label-text text-xs text-base-content/70">
              我已阅读并同意
              <a
                href="/auth/user-agreement"
                target="_blank"
                className="link link-secondary mx-1"
              >
                用户协议
              </a>
              和
              <a
                href="/auth/privacy-policy"
                target="_blank"
                className="link link-secondary mx-1"
              >
                隐私政策
              </a>
            </span>
          </label>
        </div>

        {/* 按钮组 */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={onBack}
            className="btn btn-outline col-span-1 border-base-300 text-base-content/70 hover:bg-base-200 hover:border-base-300 hover:text-base-content rounded-xl h-11 min-h-0 font-normal"
            type="button"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
          </button>

          {/* 3. 注册按钮控制：所有条件必须满足 */}
          <button
            type="submit"
            className="btn btn-secondary col-span-2 rounded-xl h-11 min-h-0 text-base font-semibold shadow-secondary/20 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-white disabled:bg-base-300 disabled:text-base-content/30 disabled:shadow-none"
            disabled={
              loading || !isPasswordValid || !verificationCode || !agreed
            }
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "立即注册"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
