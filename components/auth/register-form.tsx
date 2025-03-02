// app/components/auth/register-form.tsx

// 标记为客户端组件，表示该组件将在客户端渲染和执行
"use client";

import Link from "next/link"; // 导入 Next.js 的 Link 组件，用于导航
import { PhoneIcon, EnvelopeIcon, KeyIcon } from "@heroicons/react/24/outline"; // 导入 Heroicons 图标组件
import { ArrowRightIcon } from "@heroicons/react/20/solid"; // 导入 Heroicons 图标组件
import { Button } from "@/components/button"; // 导入自定义的 Button 组件
import { userRegister, State, checkPhoneExists } from "@/app/lib/actions"; // 导入 userRegister 动作函数，用于创建用户
import { lusitana } from "@/components/fonts"; // 导入自定义字体 lusitana
import Captcha from "@/components/captcha"; // 导入 Captcha 组件，用于验证码验证
import { useActionState, useState } from "react"; // 导入 React 的 useState 钩子，用于状态管理

// 定义注册表单组件
export default function Form() {
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false); // 定义状态变量 isCaptchaVerified，用于存储验证码是否验证通过
  const [phone, setPhone] = useState(""); // 定义状态变量 phone，用于存储用户输入的手机号
  const [captchaError, setCaptchaError] = useState(""); // 定义状态变量 phone，用于存储用户输入的手机号
  const [password, setPassword] = useState(""); // 定义状态变量 password，用于存储用户输入的密码
  const [phoneError, setPhoneError] = useState(""); // 定义状态变量 phoneError，用于存储手机号验证错误信息
  const [isPhoneVerified, setIsPhoneVerified] = useState(false); // 定义状态变量 isPhoneVerified，用于存储手机号是否已验证
  const [isExistsPhone, setIsExistsPhone] = useState(false); // 定义状态变量 isExistsPhone，用于存储手机号是否已存在]
  const [passwordError, setPasswordError] = useState(""); // 定义状态变量 passwordError，用于存储密码验证错误信息
  const [isAgree, setIsAgree] = useState(false); // 定义状态变量 isAgree，用于存储用户是否同意协议
  const [countdown, setCountdown] = useState(0); // 状态管理发送验证码按钮的倒计时
  const initialState: State = {
    errors: {
      phone: [],
      auth_code: [],
      password: [],
      isAgree: [],
    },
    message: null,
  };
  const [state, formAction] = useActionState(userRegister, initialState);

  // 验证手机号格式
  const validatePhone = (phone: string) => {
    // 定义中国手机号码的正则表达式
    const phoneRegex = /^1[3456789]\d{9}$/;
    // 如果手机号不符合格式，设置错误信息
    if (!phoneRegex.test(phone)) {
      setPhoneError("请输入有效的手机号码");
    } else {
      setPhoneError(""); // 清除错误信息
    }
    return phoneRegex.test(phone);
  };

  // 验证密码格式
  const validatePassword = (password: string) => {
    // 定义密码规则：8-16位，包含数字、字母、符号中的至少两种
    const passwordRegex =
      /^(?:(?=.*\d)(?=.*[A-Za-z])|(?=.*\d)(?=.*[@$!%*#-_?&])|(?=.*[A-Za-z])(?=.*[@$!%*#-_?&]))[A-Za-z\d@$!%*#-_?&]{8,16}$/;
    // 如果密码不符合格式，设置错误信息
    if (!passwordRegex.test(password)) {
      setPasswordError("密码必须在8-16位之间，由数字、英文、符号中的两种");
    } else {
      setPasswordError(""); // 清除错误信息
    }
  };

  // 处理手机号输入框变化的回调函数
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // 获取输入框的值
    setPhone(value); // 更新手机号状态
    validatePhone(value); // 验证手机号格式
  };

  // 处理手机号失去焦点的回调函数
  const handlePhoneBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value; // 获取输入框的值
    // 验证手机号格式通过，产更新手机号验证状态
    setIsPhoneVerified(validatePhone(phoneNumber));
    if (isPhoneVerified) {
      // 验证手机号是否已存在
      const exists = await checkPhoneExists(phoneNumber);
      setIsExistsPhone(exists); // 更新手机号是否存在状态
      if (isExistsPhone) {
        setPhoneError("该手机号已存在");
      } else {
        setPhoneError(""); // 清除错误信息
      }
    }
  };

  // 处理密码输入框变化的回调函数
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // 获取输入框的值
    setPassword(value); // 更新密码状态
    validatePassword(value); // 验证密码格式
  };

  /**
   * 发送验证码请求
   *
   * 此函数首先校验手机号格式，然后通过fetch API发送请求以获取验证码
   * 请求成功后，开始60秒倒计时，在此期间按钮将被禁用
   */
  const sendVerificationCode = async (event) => {
    event.preventDefault(); // 阻止表单默认提交行为
    console.log("发送验证码请求, 图形验证结果是：", isCaptchaVerified);
    if (!validatePhone(phone)) {
      setPhoneError("请输入有效的手机号码");
      return;
    }
    if (isExistsPhone) {
      setPhoneError("该手机号已存在");
      return;
    }
    if (!isCaptchaVerified) {
      setCaptchaError("请先完成验证码验证");
      return;
    }

    try {
      const response = await fetch("/api/auth/sms/send-verification-code", {
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

  const handleAgreeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAgree(event.target.checked);
  };
  // 渲染注册表单组件
  return (
    <form action={formAction} className="space-y-3">
      {/* 表单容器 */}
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        {/* 表单标题 */}
        <h1
          className={`${lusitana.className} mb-3 justify-self-center font-bold text-2xl text-slate-500`}
        >
          用户注册
        </h1>
        {/* 表单内容容器 */}
        <div className="w-full">
          {/* 手机号输入框 */}
          <div>
            {/* 手机号标签 */}
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="phone"
            >
              请输入手机号
            </label>
            {/* 手机号输入框 */}
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                id="phone"
                type="text"
                name="phone"
                placeholder="请输入手机号"
                required
                value={phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
              />
              {/* 手机号图标 */}
              <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {/* 手机号错误提示 */}
            {phoneError && (
              <p className="text-red-500 text-xs mt-1">{phoneError}</p>
            )}
          </div>
          {/* 图片验证码 */}
          <div>
            {/* 图片验证码标签 */}
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="captcha"
            >
              图片验证码
            </label>
            {/* 图片验证码组件 */}
            <div className="relative">
              <Captcha
                onVerify={() => {}}
                setCaptchaError={setCaptchaError}
                setIsCaptchaVerified={setIsCaptchaVerified}
              />
              {/* 图片验证码图标 */}
              <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {/* 图片验证码错误提示 */}
            {captchaError && (
              <p className="text-red-500 text-xs mt-1">{captchaError}</p>
            )}
          </div>
          {/* 短信验证码 */}
          <div className="mt-4">
            {/* 短信验证码标签 */}
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="auth_code"
            >
              短信验证码
            </label>
            {/* 短信验证码输入框 */}
            <div className="relative flex">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                id="auth_code"
                type="text"
                name="auth_code"
                placeholder="输入短信验证码"
                required
                minLength={6}
              />
              {/* 短信验证码图标 */}
              <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              {/* 获取短信验证码链接 */}
              <button
                onClick={sendVerificationCode}
                disabled={countdown > 0}
                className="absolute right-3 top-1/2 h-[18px] w-[110] -translate-y-1/2 text-sm text-cyan-700 peer-focus:text-gray-900 z-50"
              >
                {countdown ? `${countdown}秒后重试` : "获取验证码"}
              </button>
            </div>
            {/* 后端密码错误提示 */}
            {state.errors?.auth_code &&
              state.errors.auth_code.map((error, index) => (
                <p key={index} className="text-red-500 text-xs mt-1">
                  {error}
                </p>
              ))}
          </div>
          {/* 密码输入框 */}
          <div>
            {/* 密码标签 */}
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              请输入密码
            </label>
            {/* 密码输入框 */}
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-300"
                id="password"
                type="password"
                name="password"
                placeholder="8-16位，数字、英文、符号至少两种"
                required
                value={password}
                onChange={handlePasswordChange}
              />
              {/* 密码图标 */}
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {/*前端密码错误提示*/}
            {passwordError && (
              <p className="text-red-500 text-xs mt-1">{passwordError}</p>
            )}
          </div>
          {/* 用户协议和隐私政策 */}
          <div className="mt-4 text-xs">
            <label className="flex items-center cursor-pointer">
              <input
                name="agree"
                type="checkbox"
                checked={isAgree}
                onChange={handleAgreeChange}
                className="mr-2"
              />{" "}
              {/* 复选框 */}
              我已阅读并同意 {/* 文本 */}
              <Link href="/">
                {" "}
                {/* 链接 */}
                <span className="text-cyan-700">《用户协议》</span> {/* 文本 */}
              </Link>
              、 {/* 文本 */}
              <Link href="/">
                {" "}
                {/* 链接 */}
                <span className="text-cyan-700">《隐私政策》</span> {/* 文本 */}
              </Link>
            </label>
            {/* 服务器端未同意用户协议及隐私政策提示 */}
            {state.errors?.isAgree &&
            !isAgree &&
            state.errors.isAgree.length > 0 ? (
              <p className="text-red-500 text-xs mt-1">
                {state.errors.isAgree[0]}
              </p>
            ) : null}
          </div>
          {/* 注册按钮 */}
          <Button
            type="submit"
            aria-disabled={false}
            className="mt-4 w-full py-2 bg-slate-500 hover:bg-slate-400 text-white rounded-md"
          >
            立即注册 {/* 文本 */}
            <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />{" "}
            {/* 图标 */}
          </Button>
          {/* 用于显示消息的容器 */}
          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          ></div>
        </div>
        <h1 className="text-red-500 text-center text-xs">
          {state.message} {state.errors?.phone}
        </h1>
        <div className="mt-1 text-right text-sm text-gray-500">
          已有账号？ {/* 文本 */}
          <Link href="/auth/login">
            {/* 链接 */}
            <span className="text-cyan-700">立即登录</span> {/* 文本 */}
          </Link>
        </div>
      </div>
    </form>
  );
}
