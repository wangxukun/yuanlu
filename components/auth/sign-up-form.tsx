"use client";
// 注册表单组件
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { signInSchema, SignInFormValues } from "@/lib/form-schema";

export default function SignUpForm() {
  const checkedEmail = useAuthStore((state) => state.checkedEmail);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verificationCodeError, setVerificationCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formValues, setFormValues] = useState<SignInFormValues>({
    email: "",
    password: "",
  });

  // 新增：是否同意协议
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
    if (emailCheckBox) {
      setPassword("");
      setPasswordError("");
      setVerificationCode("");
      setVerificationCodeError("");
      setCodeSent(false);
      (
        document.getElementById("sign_up_modal_box") as HTMLDialogElement
      )?.close();
      emailCheckBox.showModal();
    }
  };

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerificationCodeError("");
      setPasswordError("");
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail }),
      });

      const data = await response.json();
      console.log(data.message);
      if (!data.success) throw new Error("发送失败");

      setCodeSent(true);
      setCountdown(60); // 60秒倒计时
    } catch (err) {
      console.log(err);
      setVerificationCodeError("验证码发送失败，请重试");
    }
  };

  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 新增：必须先同意协议
    if (!agreed) {
      setAgreedError("请先阅读并同意《用户协议》和《隐私政策》");
      return;
    } else {
      setAgreedError("");
    }

    // 验证密码
    try {
      const result = signInSchema.safeParse({
        email: checkedEmail,
        password,
      });
      if (!result.success) {
        const error = result.error.errors[0];
        setPasswordError(error.message);
        return;
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(true);
    try {
      // 验证验证码
      const verifyResponse = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkedEmail, code: verificationCode }),
      });
      const verifyData = await verifyResponse.json();
      console.log("Verify:", verifyData.message);
      if (verifyData.success === false) {
        setVerificationCodeError(verifyData.message);
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

      // 注册成功后关闭对话框
      const modal = document.getElementById(
        "sign_up_modal_box",
      ) as HTMLDialogElement;
      if (modal) {
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold mb-2">创建你的账户</h2>
        <p className="text-2xl text-base-content/70 mb-4">{checkedEmail}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 密码输入 */}
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
                className="grow"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormValues({ ...formValues, password: e.target.value });
                  if (passwordError) setPasswordError(""); // 清除错误信息
                }}
                required
              />
            </label>
            {passwordError && (
              <p className="text-error text-sm mt-1">{passwordError}</p>
            )}
          </div>

          {/* 验证码输入 */}
          <div className="form-control flex justify-between">
            <label className="input w-48">
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
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              <input
                type="text"
                className="grow"
                placeholder="6位数字验证码"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  if (verificationCodeError) setVerificationCodeError(""); // 清除错误信息
                }}
                required
              />
            </label>
            <div className="flex justify-between items-center mt-1">
              <button
                onClick={handleSendCode}
                className={`btn btn-sm ${countdown > 0 ? "btn-disabled" : "btn-outline"}`}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}秒后重发` : "获取验证码"}
              </button>
              {codeSent && !verificationCodeError && (
                <span className="text-success text-sm">验证码已发送至邮箱</span>
              )}
            </div>
            {verificationCodeError && (
              <p className="text-error text-sm mt-1">{verificationCodeError}</p>
            )}
          </div>

          {/* 新增：协议复选框（daisyUI checkbox） */}
          <div className="form-control">
            <label className="label cursor-pointer gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (agreedError) setAgreedError("");
                }}
                aria-required
              />
              <span className="label-text text-sm">
                我已阅读并同意{" "}
                <a
                  href="/auth/user-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary ml-1"
                >
                  《用户协议》
                </a>{" "}
                和{" "}
                <a
                  href="/auth/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary ml-1"
                >
                  《隐私政策》
                </a>
              </span>
            </label>
            {agreedError && (
              <p className="text-error text-sm mt-1">{agreedError}</p>
            )}
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
              disabled={loading || !agreed}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "注册"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
