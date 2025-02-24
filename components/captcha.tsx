import { useState, useEffect } from "react";

export default function Captcha({
  onVerify,
}: {
  onVerify: (captchaId: string) => void;
}) {
  const [captchaId, setCaptchaId] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
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
    const res = await fetch("/api/captcha/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // 如果需要传递参数，可以在这里添加
    });

    if (res.ok) {
      const captchaId = res.headers.get("X-Captcha-Id");
      setCaptchaId(captchaId || "");

      // 将图片数据转换为 Blob URL
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } else {
      setError("无法加载验证码");
    }
  };

  const handleVerify = async () => {
    const res = await fetch("/api/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captchaId, answer }),
    });

    if (res.ok) {
      onVerify(captchaId); // 将验证码 ID 传递给父组件
    } else {
      setError("验证码错误");
      await refreshCaptcha();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/*动态设置图片的src*/}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="验证码"
            onClick={refreshCaptcha}
            className="cursor-pointer"
          />
        ) : (
          <div className="w-[200px] h-[100px] bg-gray-200 flex items-center justify-center">
            加载中...
          </div>
        )}

        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="输入验证码"
          className="p-2 border"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={handleVerify} className="bg-blue-500 text-white p-2">
        验证
      </button>
    </div>
  );
}
