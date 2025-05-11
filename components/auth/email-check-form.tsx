"use client";
// components/EmailCheckForm.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SignInForm from "@/components/auth/sign-in-form";
import SignUpForm from "@/components/auth/sign-up-form";

// 主表单组件
const EmailCheckForm = () => {
  const [email, setEmail] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  const checkUserExists = async () => {
    try {
      const response = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      return (await response.json()).exists;
    } catch (err) {
      setError(`服务不可用，请稍后重试:${err}`);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    const exists = await checkUserExists();
    setLoading(false);
    console.log("EMAIL是否已存在：", exists);
    if (exists) {
      setShowSignIn(true);
    } else {
      setShowSignUp(true);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (session) {
    router.push("/dashboard");
    return null;
  }

  if (showSignIn) {
    return <SignInForm email={email} onBack={() => setShowSignIn(false)} />;
  }

  if (showSignUp) {
    return (
      <SignUpForm
        email={email}
        onBack={() => {
          setShowSignUp(false);
          setError("");
        }}
      />
    );
  }

  return (
    <div className="card bg-base-100 max-w-md mx-auto p-6">
      <div className="card-body">
        <h2 className="card-title">继续输入邮箱地址</h2>
        <p className="mb-6">已有账户可直接登录，新用户我们将帮助您创建账户</p>

        <form onSubmit={handleSubmit}>
          <div className="form-control w-full">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">邮箱地址</legend>
              <input
                type="email"
                className="input w-full"
                value={email}
                placeholder="your@email.com"
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && (
                <p className="label table-text-alt text-error">{error}</p>
              )}
            </fieldset>
          </div>

          <div className="card-actions w-full mt-8">
            <button
              type="submit"
              className={`btn btn-primary w-full ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              继续
            </button>
          </div>
        </form>

        <p className="text-sm text-gray-500 mt-4">{/* 隐私声明保持不变 */}</p>
      </div>
    </div>
  );
};

export default EmailCheckForm;
