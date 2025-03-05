"use client";

import Link from "next/link";
import { PhoneIcon, KeyIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { login, userLoginState } from "@/app/lib/actions";
import { lusitana } from "@/components/fonts";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { useActionState } from "react";

export default function Form() {
  // const [phone, setPhone] = useState(""); // 定义状态变量 phone，用于存储用户输入的手机号
  // const [phoneError, setPhoneError] = useState(""); // 定义状态变量 phoneError，用于存储手机号验证错误信息
  // const [password, setPassword] = useState(""); // 定义状态变量 password，用于存储用户输入的密码
  // const [passwordError, setPasswordError] = useState(""); // 定义状态变量 passwordError，用于存储密码验证错误信息

  const initialState: userLoginState = {
    errors: {
      phone: [],
      password: [],
    },
    message: null,
  };

  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-3">
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
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                id="phone"
                type="text"
                name="phone"
                placeholder="请输入手机号"
                required
              />
              <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {/* 后端密码错误提示 */}
            {/*{state.errors?.phone &&*/}
            {/*    state.errors.phone.map((error, index) => (*/}
            {/*        <p key={index} className="text-red-500 text-xs mt-1">*/}
            {/*          {error}*/}
            {/*        </p>*/}
            {/*    ))}*/}
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
                placeholder="请输入密码"
                required
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {/* 后端密码错误提示 */}
            {/*{state.errors?.password &&*/}
            {/*    state.errors.password.map((error, index) => (*/}
            {/*        <p key={index} className="text-red-500 text-xs mt-1">*/}
            {/*          {error}*/}
            {/*        </p>*/}
            {/*    ))}*/}
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
          <Link href="/auth/register">
            <span className="text-cyan-700">忘记密码</span>
          </Link>
          <span className="text-gray-500 pl-1 pr-1"> | </span>
          <Link href="/auth/register">
            <span className="text-cyan-700">没有账号</span>
          </Link>
        </div>
        <div className="flex justify-center">
          {state.message && (
            <p className="text-red-500 text-xs mt-1">{state.message}</p>
          )}
        </div>
      </div>
    </form>
  );
}
