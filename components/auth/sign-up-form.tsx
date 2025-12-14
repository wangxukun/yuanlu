"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { signInSchema } from "@/lib/form-schema";
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ArrowUturnLeftIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";

export default function SignUpForm() {
  const checkedEmail = useAuthStore((state) => state.checkedEmail);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verificationCodeError, setVerificationCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 是否同意协议
  const [agreed, setAgreed] = useState(false);
  const [agreedError, setAgreedError] = useState("");

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

    // 关闭当前弹窗 (兼容新旧ID)
    const currentModal = (document.getElementById("my_modal_register") ||
      document.getElementById("sign_up_modal_box")) as HTMLDialogElement;

    if (emailCheckBox) {
      // 重置状态
      setPassword("");
      setPasswordError("");
      setVerificationCode("");
      setVerificationCodeError("");
      setCodeSent(false);

      if (currentModal) currentModal.close();
      emailCheckBox.showModal();
    }
  };

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault(); // 防止触发表单提交
    try {
      setVerificationCodeError("");
      setPasswordError("");
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

    // 1. 协议验证
    if (!agreed) {
      setAgreedError("请先阅读并同意用户协议");
      return;
    } else {
      setAgreedError("");
    }

    // 2. 密码格式验证
    // 注意：这里我们构造一个完整的对象来匹配 signInSchema 的要求
    try {
      const result = signInSchema.safeParse({
        email: checkedEmail,
        password,
      });
      if (!result.success) {
        // 提取密码相关的错误
        const error = result.error.errors.find((e) =>
          e.path.includes("password"),
        );
        if (error) {
          setPasswordError(error.message);
          return;
        }
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(true);
    try {
      // 3. 验证验证码
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

      // 4. 创建用户
      const createResponse = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail, password }),
      });
      const createData = await createResponse.json();

      if (!createData.success) throw new Error(createData.message);

      // 5. 成功后处理
      const modal = (document.getElementById("my_modal_register") ||
        document.getElementById("sign_up_modal_box")) as HTMLDialogElement;
      if (modal) modal.close();

      // 显示注册成功提示 (保持原有逻辑)
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

      // 这里可以触发登录弹窗，或者让用户手动点击
      const loginModal = (document.getElementById("my_modal_login") ||
        document.getElementById("sign_in_modal_box")) as HTMLDialogElement;
      if (loginModal) loginModal.showModal();
    } catch (err) {
      console.error(err);
      // 如果是通用错误，可以显示在某个地方，这里暂时借用验证码错误显示
      setVerificationCodeError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* 用户信息展示区 */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="avatar placeholder mb-2">
          <div className="bg-base-200 text-secondary rounded-full w-16 h-16 ring ring-secondary ring-offset-base-100 ring-offset-2  grid place-items-center">
            <UserIcon className="mt-4 block w-8 h-8" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium text-base-content">{checkedEmail}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 密码输入 */}
        <div className="form-control">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-secondary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              className={`input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-secondary transition-all rounded-xl h-12 ${passwordError ? "input-error" : ""}`}
              placeholder="设置登录密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              required
            />
          </div>
          {passwordError && (
            <div className="text-error text-xs mt-1 ml-1 flex items-center gap-1">
              <ExclamationCircleIcon className="w-3 h-3" /> {passwordError}
            </div>
          )}
        </div>

        {/* 验证码输入 (使用 Join 组件优化布局) */}
        <div className="form-control">
          <div className="join w-full shadow-sm">
            <div className="relative w-full join-item">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20 text-base-content/40">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <input
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
                required
              />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              className="btn btn-secondary join-item w-[110px] h-12 font-normal text-white"
              disabled={countdown > 0}
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
            </div>
          </div>
        </div>

        {/* 协议复选框 */}
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3 py-0">
            <input
              type="checkbox"
              className={`checkbox checkbox-sm checkbox-secondary rounded-md ${agreedError ? "checkbox-error" : ""}`}
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (agreedError) setAgreedError("");
              }}
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
          {agreedError && (
            <p className="text-error text-xs mt-1 ml-8">{agreedError}</p>
          )}
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

          <button
            type="submit"
            className="btn btn-secondary col-span-2 rounded-xl h-11 min-h-0 text-base font-semibold shadow-secondary/20 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-white"
            disabled={loading}
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
