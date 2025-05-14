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
      if (result.ok) {
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
    <div className="card bg-base-100 max-w-md mx-auto p-6">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">欢迎回来</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-control w-full">
            {/* 邮箱显示 */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">邮箱地址</legend>
              <input
                type="email"
                className="input w-full"
                value={checkedEmail}
                placeholder="your@email.com"
                readOnly
              />
            </fieldset>

            {/* 密码输入 */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">密码</legend>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                ref={passwordInputRef}
              />
              {error && (
                <p className="label table-text-alt text-error">{error}</p>
              )}
            </fieldset>
          </div>

          <div className="card-actions mt-8 justify-end">
            <button
              type="submit"
              className={`btn btn-primary${loading ? "loading" : ""}`}
              disabled={loading}
            >
              登录
            </button>
            <button
              onClick={onBack}
              className="btn btn-accent btn-outline btn-md self-start"
            >
              返回
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
