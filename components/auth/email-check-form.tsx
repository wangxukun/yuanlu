"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { validateEmail } from "@/app/lib/tools";

// 主表单组件
const EmailCheckForm = () => {
  const setCheckedEmail = useAuthStore((state) => state.setCheckedEmail);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, []);

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
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟延迟
    const exists = await checkUserExists();
    setCheckedEmail(email);
    setLoading(false);
    const emailCheckBox = document.getElementById(
      "email_check_modal_box",
    ) as HTMLDialogElement;
    if (emailCheckBox) {
      emailCheckBox.close();
    }
    console.log("EMAIL是否已存在：", exists);
    if (exists) {
      const signUpBox = document.getElementById(
        "sign_in_modal_box",
      ) as HTMLDialogElement;
      if (signUpBox) {
        signUpBox.showModal();
      }
    } else {
      const signUpBox = document.getElementById(
        "sign_up_modal_box",
      ) as HTMLDialogElement;
      if (signUpBox) {
        signUpBox.showModal();
      }
    }
  };

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
                className="input validator w-full"
                value={email}
                required
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
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner text-primary loading-sm"></span>
              ) : (
                "继续"
              )}
            </button>
          </div>
        </form>

        <p className="text-sm text-gray-500 mt-4">{/* 隐私声明保持不变 */}</p>
      </div>
    </div>
  );
};

export default EmailCheckForm;
