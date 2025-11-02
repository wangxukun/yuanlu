"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

const SIGNIN_ERROR_URL = "/error";
// 使用电子邮箱登录或注册表单
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
    if (emailCheckBox) {
      setError("");
      setPassword("");
      (
        document.getElementById("sign_in_modal_box") as HTMLDialogElement
      ).close();
      emailCheckBox.showModal();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 这里添加实际的登录逻辑
      // await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟延迟
      const result = await signIn("credentials", {
        redirect: false,
        email: checkedEmail,
        password,
      });
      if (result?.error) {
        setError("密码错误，请重试");
        return;
      }
      if (result?.ok) {
        (
          document.getElementById("sign_in_modal_box") as HTMLDialogElement
        ).close();
      }
    } catch (error) {
      // Signin can fail for a number of reasons, such as the user
      // not existing, or the user not having the correct role.
      // In some cases, you may want to redirect to a custom error
      if (error instanceof AuthError) {
        return redirect(`${SIGNIN_ERROR_URL}?error=${error.type}`);
      }
      // Otherwise if a redirects happens Next.js can handle it
      // so you can just re-thrown the error and let Next.js handle it.
      // Docs:
      // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold mb-2">欢迎回来</h2>
        <p className="text-2xl text-base-content/70 mb-4">{checkedEmail}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="input w-full">
              <svg
                className="h-[1em] opacity-50 size-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                />
              </svg>
              <input
                type="password"
                className="input input-bordered w-full grow focus:outline-none"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                ref={passwordInputRef}
              />
            </label>
            {error && <p className="text-error text-sm mt-1">{error}</p>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="btn btn-outline flex-1"
              type="button"
            >
              返回
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "登录"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
