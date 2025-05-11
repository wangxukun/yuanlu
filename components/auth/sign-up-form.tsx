// 注册表单组件
import { useEffect, useState } from "react";

export default function SignUpForm({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 验证码倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      setError("");
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log(data.message);
      if (!data.success) throw new Error("发送失败");

      setCodeSent(true);
      setCountdown(60); // 60秒倒计时
    } catch (err) {
      console.log(err);
      setError("验证码发送失败，请重试");
    }
  };

  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 验证验证码
      const verifyResponse = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const verifyData = await verifyResponse.json();
      console.log("Verify:", verifyData.message);
      if (verifyData.success === false) throw new Error(verifyData.message);

      // 创建用户
      const createResponse = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const createData = await createResponse.json();

      if (!createData.success) throw new Error(createData.message);

      // 注册成功后关闭对话框
      const modal = document.getElementById(
        "login_modal_box",
      ) as HTMLDialogElement;
      if (modal) {
        onBack(); // 回到登录页面
        modal.close(); // 关闭对话框
      }

      // 显示注册成功提示
      const toast = document.createElement("div");
      toast.className = "toast toast-middle toast-center";
      toast.innerHTML = `
            <div class="alert alert-success">
                <span>注册成功！</span>
            </div>
        `;
      document.body.appendChild(toast);
      // 3秒后移除提示
      setTimeout(() => {
        toast.remove();
      }, 3000);

      // 注册成功后自动登录或跳转
      // window.location.href = '/';
    } catch (err) {
      setError(err.message || "注册失败，请检查信息");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 max-w-md mx-auto p-6">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">创建账户</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-control w-full">
            {/* 邮箱显示 */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">邮箱地址</legend>
              <input
                type="email"
                className="input w-full"
                value={email}
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
              />
            </fieldset>
          </div>
          <fieldset className="fieldset">
            {/* 验证码输入 */}
            <legend className="fieldset-legend">验证码</legend>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="6位数字验证码"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                required
              />
              <button
                onClick={handleSendCode}
                className={`btn btn-md ${countdown > 0 ? "btn-disabled" : ""}`}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}秒后重发` : "获取验证码"}
              </button>
            </div>
            {codeSent && !error && (
              <p className="label-text-alt text-success">验证码已发送至邮箱</p>
            )}
            {error && <p className="text-error mt-2">{error}</p>}
          </fieldset>
          <div className="card-actions mt-8 justify-end">
            <button
              onClick={onBack}
              className="btn btn-accent btn-outline btn-md self-start"
            >
              返回
            </button>
            <button
              type="submit"
              className={`btn btn-primary${loading ? "loading" : ""}`}
              disabled={loading}
            >
              注册
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
