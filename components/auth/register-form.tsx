"use client";

import Link from "next/link";
import { PhoneIcon, EnvelopeIcon, KeyIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { createUser } from "@/app/lib/actions";
import { lusitana } from "@/components/fonts";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

export default function Form() {
  return (
    <form action={createUser} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1
          className={`${lusitana.className} mb-3 justify-self-center font-bold text-2xl text-slate-500`}
        >
          用户注册
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
          </div>
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="sms-code"
            >
              短信验证码
            </label>
            <div className="relative flex">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                id="sms-code"
                type="text"
                name="sms-code"
                placeholder="输入短信验证码"
                required
                minLength={6}
              />
              <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              <a
                href="#"
                className="absolute right-3 top-1/2 h-[18px] w-[110] -translate-y-1/2 text-sm text-cyan-700 peer-focus:text-gray-900 z-50"
              >
                获取验证码
              </a>
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
                placeholder="8-16位，数字、英文、符号中的两种"
                required
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            我已阅读并同意
            <Link href="/">
              <span className="text-cyan-700">《用户协议》</span>
            </Link>
            、
            <Link href="/">
              <span className="text-cyan-700">《隐私政策》</span>
            </Link>
          </label>
        </div>
        <Button
          type="submit"
          aria-disabled={false}
          className="mt-4 w-full py-2 bg-slate-500 hover:bg-slate-400 text-white rounded-md"
        >
          立即注册 <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </Button>
        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        ></div>
      </div>
    </form>
  );
}
