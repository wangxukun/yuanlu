// app/components/SmsForm.tsx
"use client"; // 标记为客户端组件

import { useState } from "react";

/**
 * SMS验证码发送表单组件
 *
 * 该组件允许用户输入手机号码，并请求发送验证码短信
 * 它包括手机号输入框和发送验证码按钮，按钮在倒计时结束前会禁用
 */
export default function SmsForm() {
  const [phone, setPhone] = useState(""); // 状态管理手机号码
  const [countdown, setCountdown] = useState(0); // 状态管理发送验证码按钮的倒计时

  /**
   * 校验手机号格式
   *
   * @param phone 手机号码字符串
   * @returns 返回布尔值，表示手机号格式是否正确
   */
  const validatePhone = (phone: string) => {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(phone);
  };

  /**
   * 发送验证码请求
   *
   * 此函数首先校验手机号格式，然后通过fetch API发送请求以获取验证码
   * 请求成功后，开始60秒倒计时，在此期间按钮将被禁用
   */
  const sendVerificationCode = async () => {
    if (!validatePhone(phone)) {
      alert("请输入有效的手机号码");
      return;
    }

    try {
      const response = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (data.success) {
        // 开始60秒倒计时
        setCountdown(60);
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) clearInterval(interval);
            return prev - 1;
          });
        }, 1000);
      } else {
        alert(`发送失败: ${data.message}`);
      }
    } catch (error) {
      alert(`请求失败，请检查网络: ${error}`);
    }
  };

  return (
    <div>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="请输入手机号"
      />
      <button onClick={sendVerificationCode} disabled={countdown > 0}>
        {countdown ? `${countdown}秒后重试` : "获取验证码"}
      </button>
    </div>
  );
}
