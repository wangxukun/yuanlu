"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";
import { signInSchema } from "@/lib/form-schema";
import { EnvelopeIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";

const EmailCheckForm = () => {
  const setCheckedEmail = useAuthStore((state) => state.setCheckedEmail);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  // 引用输入框以实现自动聚焦
  const inputRef = useRef<HTMLInputElement>(null);

  // 组件挂载或弹窗显示时自动聚焦
  useEffect(() => {
    // 仅在客户端执行的代码
    // 稍微延迟以等待动画完成
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 如果已登录则跳转
  useEffect(() => {
    if (session) router.push("/");
  }, [session, router]);

  const checkUserExists = async () => {
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Network response was not ok");
      return (await res.json()).exists;
    } catch (err) {
      console.error(err);
      setError("服务暂不可用，请稍后重试");
      return null; // 返回 null 表示检查失败
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      // 1. 本地格式验证
      const emailSchema = signInSchema.pick({ email: true });
      const result = emailSchema.safeParse({ email }); // 仅验证邮箱
      if (!result.success) {
        // 提取 Zod 错误信息中关于 email 的部分
        const emailError = result.error.errors[0];
        setError(emailError?.message || "请输入有效的邮箱地址");
        return;
      }
    } catch (err) {
      // 避免 catch 块掩盖真实的程序错误
      console.error("Schema validation error:", err);
      setError("验证过程发生错误，请刷新重试");
      return;
    }

    setLoading(true);

    try {
      // 2. 模拟网络延迟 (可选，为了视觉体验)
      await new Promise((r) => setTimeout(r, 500));

      // 3. 检查用户是否存在
      const exists = await checkUserExists();

      if (exists === null) {
        setLoading(false);
        return; // 检查失败，停留在当前页面
      }

      // 4. 更新状态并切换弹窗
      setCheckedEmail(email);

      const currentModal = document.getElementById(
        "email_check_modal_box",
      ) as HTMLDialogElement;
      if (currentModal) currentModal.close();

      // 根据用户是否存在决定跳转到登录还是注册
      const nextModalId = exists ? "sign_in_modal_box" : "sign_up_modal_box";
      const nextModal = document.getElementById(
        nextModalId,
      ) as HTMLDialogElement;

      // 兼容旧 ID (如果新组件还没完全替换)
      const fallbackModalId = exists
        ? "sign_in_modal_box"
        : "sign_up_modal_box";
      const targetModal =
        nextModal ||
        (document.getElementById(fallbackModalId) as HTMLDialogElement);

      if (targetModal) {
        targetModal.showModal();
      }
    } catch (err) {
      console.error(err);
      setError("发生未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form
        suppressHydrationWarning
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="form-control">
          {/* 输入框区域 */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-base-content/40 group-focus-within:text-primary transition-colors">
              <EnvelopeIcon className="h-5 w-5" />
            </div>
            <input
              suppressHydrationWarning
              ref={inputRef}
              type="email"
              className="input input-bordered w-full pl-11 bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all rounded-xl h-12 text-base shadow-sm"
              placeholder="请输入邮箱地址"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(""); // 输入时清除错误
              }}
              disabled={loading}
              required
            />
          </div>

          {/* 错误提示区域 */}
          <div className="h-6 mt-1.5 flex items-center">
            {error && (
              <div className="flex items-center gap-1.5 text-error text-sm animate-in slide-in-from-top-1 fade-in">
                <ExclamationCircleIcon className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex flex-col gap-3">
          <button
            type="submit"
            className="btn btn-primary w-full rounded-xl h-12 text-base font-semibold shadow-primary/20 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm text-primary-content"></span>
            ) : (
              <>
                继续 <ArrowRightIcon className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-ghost w-full rounded-xl h-11 font-normal text-base-content/60 hover:bg-base-200"
            onClick={() => {
              const modal = document.getElementById(
                "email_check_modal_box",
              ) as HTMLDialogElement;
              if (modal) modal.close();
            }}
            disabled={loading}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailCheckForm;
