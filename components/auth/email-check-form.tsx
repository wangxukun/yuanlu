"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { signInSchema } from "@/lib/form-schema";

const EmailCheckForm = () => {
  const setCheckedEmail = useAuthStore((state) => state.setCheckedEmail);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  // 👇 新增：ref 引用输入框
  // const inputRef = useRef<HTMLInputElement>(null);

  // 👇 组件渲染后自动聚焦
  // useEffect(() => {
  //   // 使用 setTimeout 确保 DaisyUI 动画已完成
  //   const timer = setTimeout(() => {
  //     inputRef.current?.focus();
  //   }, 100);
  //   return () => clearTimeout(timer);
  // }, []);

  useEffect(() => {
    if (session) router.push("/");
  }, [session]);

  const checkUserExists = async () => {
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      return (await res.json()).exists;
    } catch (err) {
      setError(`服务不可用，请稍后重试: ${err}`);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = signInSchema.safeParse({ email, password: "xxxx1111" });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
    } catch {
      setError("请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const exists = await checkUserExists();
    setCheckedEmail(email);
    setLoading(false);

    const modal = document.getElementById(
      "email_check_modal_box",
    ) as HTMLDialogElement;
    modal?.close();

    const nextModal = document.getElementById(
      exists ? "sign_in_modal_box" : "sign_up_modal_box",
    ) as HTMLDialogElement;
    nextModal?.showModal();
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold mb-2">请输入邮箱地址</h2>
        <p className="text-sm text-base-content/70 mb-4">
          已有账户可直接登录，新用户我们将帮助您创建账户。
        </p>

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
                  d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25"
                />
              </svg>

              <input
                // ref={inputRef} // 👈 绑定 ref
                type="email"
                className="input input-bordered w-full grow focus:outline-none"
                placeholder="你的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {error && <p className="text-error text-sm mt-1">{error}</p>}
          </div>

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
        </form>
      </div>
    </div>
  );
};

export default EmailCheckForm;
