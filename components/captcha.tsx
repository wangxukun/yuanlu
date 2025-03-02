import { useState, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline"; // 引入 Heroicons

export default function Captcha({
  onVerify,
  setCaptchaError,
  setIsCaptchaVerified,
}: {
  onVerify: (captchaId: string) => void;
  setCaptchaError: (captchaError: string) => void;
  setIsCaptchaVerified: (isCaptchaVerified: boolean) => void;
}) {
  const [captchaId, setCaptchaId] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false); // 使用布尔值表示是否验证失败
  const [success, setSuccess] = useState(false); // 使用布尔值表示是否验证成功
  const [imageUrl, setImageUrl] = useState<string | null>(null); // 存储图片的 Blob URL

  // 初始化加载验证码图片
  useEffect(() => {
    refreshCaptcha();
  }, []);

  // 组件卸载时释放 Blob URL
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const refreshCaptcha = async () => {
    const res = await fetch("/api/auth/captcha/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // 如果需要传递参数，可以在这里添加
    });

    // 如果请求成功（生成图片验证码），获取验证码 ID
    if (res.ok) {
      const captchaId = res.headers.get("X-Captcha-Id");
      setCaptchaId(captchaId || "");

      // 将图片数据转换为 Blob URL
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } else {
      setError(true); // 加载失败时显示错误图标
    }
  };

  const handleVerify = async () => {
    const res = await fetch("/api/auth/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captchaId, answer }),
    });

    // 如果验证成功，将验证码 ID 传递给父组件
    if (res.ok) {
      setSuccess(true); // 验证成功
      setError(false); // 清除错误状态
      onVerify(captchaId); // 将验证码 ID 传递给父组件
      setCaptchaError(""); // 清除错误信息
      setIsCaptchaVerified(true);
    } else {
      setError(true); // 验证失败
      setSuccess(false); // 清除成功状态
      setCaptchaError("请先完成验证码验证"); // 设置错误信息
      setIsCaptchaVerified(false);
      await refreshCaptcha();
    }
  };

  const handleBlur = () => {
    handleVerify();
  };

  return (
    <div className="flex justify-between items-center space-x-4">
      {/* 验证码输入框在左边 */}
      <div className="flex flex-col space-y-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onBlur={handleBlur}
          required
          placeholder="输入验证码"
          className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
        />
      </div>
      {/* 显示成功或错误图标 */}
      {success && (
        <CheckCircleIcon className="w-6 h-6 text-green-500" /> // 成功图标
      )}
      {error && (
        <XCircleIcon className="w-6 h-6 text-red-500" /> // 错误图标
      )}
      {/* 验证码图片在右边 */}
      <div className="flex items-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="验证码"
            onClick={refreshCaptcha}
            className="cursor-pointer max-w-[80px] max-h-[80px]"
          />
        ) : (
          <div className="max-w-[80px] max-h-[80px] bg-gray-200 flex items-center justify-center">
            加载中...
          </div>
        )}
      </div>
    </div>
  );
}
