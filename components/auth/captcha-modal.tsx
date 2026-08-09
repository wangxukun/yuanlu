"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface CaptchaModalProps {
  onSuccess: (data: any) => void;
  onClose: () => void;
}

export default function CaptchaModal({ onSuccess, onClose }: CaptchaModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captchaInstance = useRef<any>(null);

  useEffect(() => {
    // 等待 SDK 加载完成

    // 但是此处为号码认证服务自带的无痕验证/滑块验证，这里使用的是 ct4.js 的初始化
    const initCt4 = () => {
       if ((window as any).initAlicom4) {
         (window as any).initAlicom4({
           captchaId: process.env.NEXT_PUBLIC_CAPTCHA_APP_ID || 'yours',
           product: 'bind',
           https: true,
         }, function (captcha: any) {
            captchaInstance.current = captcha;
            captcha.onNextReady(function () {
               if (containerRef.current) {
                 containerRef.current.innerHTML = '<div class="text-sm text-center text-base-content/60 py-8">正在唤起阿里云安全验证组件...<br/>请在弹出的窗口中完成滑动操作</div>';
               }
               captcha.showCaptcha();
            }).onSuccess(function () {
               const result = captcha.getValidate();
               onSuccess({
                 lotNumber: result.lot_number,
                 passToken: result.pass_token,
                 genTime: result.gen_time,
                 captchaOutput: result.captcha_output,
               });
            }).onError(function (e: any) {
               console.error("Captcha Error:", e);
            });
         });
       }
    };

    // 我们加载 ct4 SDK
    // 如果还没加载，可以通过 Script 引入
    const checkSdk = setInterval(() => {
      if ((window as any).initAlicom4) {
        clearInterval(checkSdk);
        initCt4();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkSdk);
      if (!(window as any).initAlicom4 && containerRef.current) {
        containerRef.current.innerHTML = '<div class="text-error text-sm text-center">图形验证码资源 (ct4.js) 加载失败。<br/><br/>请前往阿里云控制台下载专属的前端代码 (ct4.js) 并放置在项目的 <b>public</b> 目录下。</div>';
      }
    }, 5000);

    return () => {
      clearInterval(checkSdk);
      clearTimeout(timeout);
    };
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Script src="https://g.alicdn.com/AWSC/AWSC/awsc.js" strategy="afterInteractive" />
      <Script src="https://g.alicdn.com/AWSC/uab/140.web.js" strategy="afterInteractive" />
      <Script src="/ct4.js" strategy="afterInteractive" />
      <div className="bg-base-100 p-6 rounded-2xl shadow-xl relative max-w-sm w-full">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-base-content/50 hover:text-base-content"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold mb-4">安全验证</h3>
        <p className="text-sm text-base-content/70 mb-4">为了您的账号安全，请完成以下验证：</p>
        
        {/* 阿里验证码容器 */}
        <div id="captcha-container" ref={containerRef} className="min-h-[200px] flex items-center justify-center">
          <span className="loading loading-spinner text-primary"></span>
        </div>
      </div>
    </div>
  );
}
