// app/components/SmsForm.tsx
"use client"; // 标记为客户端组件

import { useState } from "react";

export default function SmsForm() {
  const [phone, setPhone] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 校验手机号格式
  const validatePhone = (phone: string) => {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(phone);
  };

  // 发送验证码请求
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
