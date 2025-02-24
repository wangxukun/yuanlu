"use client";

import { useState } from "react";
import Captcha from "@/components/Captcha";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

  const handleSendCode = async () => {
    if (!isCaptchaVerified) return alert("请先完成验证");
    // 调用短信发送接口
  };

  return (
    <div className="max-w-sm mx-auto mt-5 p-4">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="手机号"
        className="w-full p-2 border mb-4"
      />
      <Captcha onVerify={() => setIsCaptchaVerified(true)} />
      <button
        onClick={handleSendCode}
        disabled={!isCaptchaVerified}
        className="w-full bg-green-500 text-white p-2 mt-4 disabled:bg-gray-400"
      >
        发送验证码
      </button>
    </div>
  );
}
