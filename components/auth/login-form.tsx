"use client";
import Link from "next/link";
import { PhoneIcon, KeyIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { lusitana } from "@/components/fonts";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";

export default function Form({
  onOpenRegisterDialog,
  onCloseLoginDialog,
}: {
  onOpenRegisterDialog?: () => void;
  onCloseLoginDialog?: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // 创建引用，绑定到手机号输入框
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // 组件渲染完成后，聚焦手机号输入框
  useEffect(() => {
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, []); // 空依赖数组，确保只在组件挂载时执行一次

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      redirect: false,
      phone,
      password,
    });
    if (result?.error) {
      alert(result.error);
    } else {
      onCloseLoginDialog?.(); // 登录成功处理函数：关闭对话框
      // router.push("/dashboard");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
          <h1
            className={`${lusitana.className} mb-3 justify-self-center font-bold text-2xl text-slate-500`}
          >
            用户登录
          </h1>
          <div className="w-full">
            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="phone"
              >
                请输入手机号
              </label>
              <div className="relative">
                <input
                  ref={phoneInputRef} // 绑定引用
                  className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                  id="phone"
                  type="text"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  required
                />
                <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              </div>
            </div>

            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="password"
              >
                请输入密码
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
                <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            aria-disabled={false}
            className="mt-8 w-full py-2 bg-slate-500 hover:bg-slate-400 text-white rounded-md"
          >
            立即登录 <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
          </Button>
          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          ></div>
          <div className="flex justify-end text-sm">
            <Link href="/auth/signup">
              <span className="text-cyan-700">忘记密码</span>
            </Link>
            <span className="text-gray-500 pl-1 pr-1"> | </span>
            <button
              type="button"
              onClick={() => {
                onOpenRegisterDialog?.();
                onCloseLoginDialog?.();
              }}
              className="text-cyan-700"
            >
              没有账号
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
