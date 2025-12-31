"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import {
  LockClosedIcon,
  ArrowUturnLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { ExclamationCircleIcon, UserIcon } from "@heroicons/react/24/solid";

const SIGNIN_ERROR_URL = "/error";

export default function SignInForm() {
  // 登录表单组件
  const checkedEmail = useAuthStore((state) => state.checkedEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 创建对密码输入框的引用
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // 在组件挂载时设置焦点
  useEffect(() => {
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, []);

  const onBack = (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheckBox = document.getElementById(
      "email_check_modal_box",
    ) as HTMLDialogElement;

    // 尝试获取当前弹窗 (兼容新旧 ID)
    const currentModal = (document.getElementById("my_modal_login") ||
      document.getElementById("sign_in_modal_box")) as HTMLDialogElement;

    if (emailCheckBox) {
      setError("");
      setPassword("");
      if (currentModal) currentModal.close();
      emailCheckBox.showModal();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: checkedEmail,
        password,
      });

      if (result?.error) {
        setError("密码错误，请重试");
        setLoading(false); // 确保在错误时停止 loading
        return;
      }

      if (result?.ok) {
        const currentModal = (document.getElementById("my_modal_login") ||
          document.getElementById("sign_in_modal_box")) as HTMLDialogElement;
        if (currentModal) currentModal.close();

        // 登录成功，跳转到首页
        redirect("/home");
      }
    } catch (error) {
      if (error instanceof AuthError) {
        return redirect(`${SIGNIN_ERROR_URL}?error=${error.type}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* 用户信息展示区 */}
      <div className="flex flex-col items-center justify-center space-y-3 mb-8">
        <div className="avatar placeholder animate-in zoom-in duration-300">
          <div className="bg-base-200 text-primary rounded-full w-20 h-20 ring ring-primary ring-offset-base-100 ring-offset-2 flex items-center justify-center shadow-lg">
            <span className="flex items-center justify-center w-full h-full text-3xl font-bold text-secondary">
              {checkedEmail?.charAt(0).toUpperCase() || (
                <UserIcon className="w-20 h-20" />
              )}
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-base-content/50 mb-1">正在登录</p>
          <p className="font-semibold text-xl text-base-content tracking-tight">
            {checkedEmail}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        suppressHydrationWarning
        className="space-y-6"
      >
        <div className="form-control space-y-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type="password"
              suppressHydrationWarning
              className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 text-base shadow-sm"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(""); // 输入时清除错误
              }}
              required
              ref={passwordInputRef}
            />
          </div>

          {/* 错误提示 */}
          <div className="h-6 flex items-center">
            {error && (
              <div className="flex items-center gap-1.5 text-error text-sm animate-in slide-in-from-top-1 fade-in">
                <ExclamationCircleIcon className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* 按钮组 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={onBack}
            className="btn btn-outline border-base-300 text-base-content/70 hover:bg-base-200 hover:border-base-300 hover:text-base-content rounded-xl h-11 min-h-0 font-normal"
            type="button"
          >
            <ArrowUturnLeftIcon className="w-4 h-4 mr-1" />
            返回
          </button>

          <button
            type="submit"
            className="btn btn-primary rounded-xl h-11 min-h-0 text-base font-semibold shadow-primary/20 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm text-primary-content"></span>
            ) : (
              <>
                登录 <ArrowRightIcon className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            className="text-xs text-base-content/40 hover:text-primary transition-colors"
          >
            忘记密码?
          </button>
        </div>
      </form>
    </div>
  );
}
