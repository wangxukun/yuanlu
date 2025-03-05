// app/components/auth/register-form.tsx

// 标记为客户端组件，表示该组件将在客户端渲染和执行
"use client";

import Link from "next/link"; // 导入 Next.js 的 Link 组件，用于导航
import { PhoneIcon, EnvelopeIcon, KeyIcon } from "@heroicons/react/24/outline"; // 导入 Heroicons 图标组件
import { ArrowRightIcon } from "@heroicons/react/20/solid"; // 导入 Heroicons 图标组件
import { Button } from "@/components/button"; // 导入自定义的 Button 组件
import { userRegister, userRegisterState } from "@/app/lib/actions"; // 导入 userRegister 动作函数，用于创建用户
import { lusitana } from "@/components/fonts"; // 导入自定义字体 lusitana
import Captcha from "@/components/captcha"; // 导入 Captcha 组件，用于验证码验证
import { useActionState, useState } from "react";

// 用户协议内容
const userAgreementContent = `
  <div class="space-y-4">
    <h2 class="text-lg font-bold text-slate-500">用户协议（User Agreement）</h2>
    <p class="text-sm text-gray-500">生效日期：2025年3月3日</p>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">1. 协议接受</h3>
      <p class="text-sm text-gray-500">
        用户注册或使用本网站服务前，需仔细阅读并同意本协议。若不同意条款，请停止使用服务。
      </p>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">2. 服务内容</h3>
      <p class="text-sm text-gray-500">
        本网站提供英语学习播客、文本资料、录音工具及社区互动功能（如评论、笔记分享）。用户需自行负责上传内容的合法性及原创性。
      </p>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">3. 用户行为规范</h3>
      <ul class="list-disc list-inside text-sm text-gray-500">
        <li>禁止发布违法、侵权或不实信息；</li>
        <li>不得干扰网站正常运营或 bypass 安全措施；</li>
        <li>用户生成内容（UGC）的知识产权归属用户，但本网站有权非独占性使用相关内容。</li>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">4. 免责声明</h3>
      <p class="text-sm text-gray-500">
        本网站对播客内容的准确性、完整性不承担法律责任，用户需自行判断信息适用性。
      </p>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">5. 协议修改与终止</h3>
      <p class="text-sm text-gray-500">
        本网站可单方面更新协议，用户继续使用视为接受变更；若用户违反条款，本网站有权终止其账户。
      </p>
    </div>
  </div>
`;

// 隐私政策内容
const privacyPolicyContent = `
  <div class="space-y-4">
    <h2 class="text-lg font-bold text-slate-500">隐私政策（Privacy Policy）</h2>
    <p class="text-sm text-gray-500">生效日期：2025年3月3日</p>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">1. 信息收集</h3>
      <ul class="list-disc list-inside text-sm text-gray-500">
        <li><strong>个人信息</strong>：注册时收集姓名、邮箱、设备信息；</li>
        <li><strong>使用数据</strong>：访问日志、播客播放记录、互动行为（如笔记、评论）。</li>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">2. 信息使用</h3>
      <ul class="list-disc list-inside text-sm text-gray-500">
        <li>提供个性化学习推荐；</li>
        <li>优化网站功能及用户体验；</li>
        <li>发送服务通知或营销信息（用户可退订）。</li>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">3. 数据共享</h3>
      <ul class="list-disc list-inside text-sm text-gray-500">
        <li>未经用户许可，不向第三方出售或共享个人信息；</li>
        <li>以下情况例外：法律要求、保护网站权益或用户安全。</li>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">4. 用户权利</h3>
      <ul class="list-disc list-inside text-sm text-gray-500">
        <li>可访问、更正或删除个人信息；</li>
        <li>可撤回同意或注销账户（需联系 <a href="mailto:wxk-zd@qq.com" class="text-cyan-700">wxk-zd@qq.com</a>）。</li>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">5. 数据安全</h3>
      <p class="text-sm text-gray-500">
        采用加密技术及访问控制措施保护用户数据，防止未经授权的访问或泄露。
      </p>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">6. 第三方服务</h3>
      <p class="text-sm text-gray-500">
        网站可能集成第三方工具（如分析插件），其数据处理遵循各自隐私政策。
      </p>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">合规说明</h3>
      <ul class="list-disc list-inside text-sm text-gray-500">
        <li>符合中国《个人信息保护法》；</li>
        <li>争议解决适用中国法律，用户可向本网站所在地法院提起诉讼。</li>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-base font-semibold text-gray-900">联系方式</h3>
      <p class="text-sm text-gray-500">
        如有疑问，请联系：<a href="mailto:wxk-zd@qq.com" class="text-cyan-700">wxk-zd@qq.com</a>。
      </p>
    </div>
  </div>
`;

// 定义注册表单组件
export default function Form() {
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false); // 定义状态变量 isCaptchaVerified，用于存储验证码是否验证通过
  const [phone, setPhone] = useState(""); // 定义状态变量 phone，用于存储用户输入的手机号
  const [captchaError, setCaptchaError] = useState(""); // 定义状态变量 phone，用于存储用户输入的手机号
  const [password, setPassword] = useState(""); // 定义状态变量 password，用于存储用户输入的密码
  const [phoneError, setPhoneError] = useState(""); // 定义状态变量 phoneError，用于存储手机号验证错误信息
  const [passwordError, setPasswordError] = useState(""); // 定义状态变量 passwordError，用于存储密码验证错误信息
  const [agree, setAgree] = useState(false); // 定义状态变量 isAgree，用于存储用户是否同意协议
  const [countdown, setCountdown] = useState(0); // 状态管理发送验证码按钮的倒计时
  const initialState: userRegisterState = {
    errors: {
      phone: [],
      auth_code: [],
      password: [],
      isAgree: false,
    },
    message: null,
  };
  const [state, formAction] = useActionState(userRegister, initialState);

  // 新增对话框相关状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState("");

  // 新增打开对话框的函数
  const openDialog = (content: string) => {
    setDialogContent(content);
    setIsDialogOpen(true);
  };

  // 新增关闭对话框的函数
  const closeDialog = () => {
    setIsDialogOpen(false);
  };

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
    setAgree(event.target.checked);
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
                className="absolute right-3 top-1/2 h-[18px] w-[110] -translate-y-1/2 text-sm text-cyan-700 peer-focus:text-gray-900 z-10"
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
                checked={agree}
                onChange={handleAgreeChange}
                className="mr-2"
              />{" "}
              {/* 复选框 */}
              我已阅读并同意 {/* 文本 */}
              <span
                className="text-cyan-700 cursor-pointer"
                onClick={() => openDialog(userAgreementContent)}
              >
                《用户协议》
              </span>{" "}
              、 {/* 文本 */}
              <span
                className="text-cyan-700 cursor-pointer"
                onClick={() => openDialog(privacyPolicyContent)}
              >
                《隐私政策》
              </span>
            </label>
            {/* 服务器端未同意用户协议及隐私政策提示 */}
            {state.errors?.isAgree && !agree && state.errors.isAgree ? (
              <p className="text-red-500 text-xs mt-1">
                必须同意用户协议和隐私政策
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

      {/* 《用户协议》《隐私政策》对话框组件 */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
          onClick={closeDialog}
        >
          <div
            className="bg-white p-6 rounded-lg max-w-2xl w-full h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500"
              onClick={closeDialog}
            >
              &times;
            </button>
            <div dangerouslySetInnerHTML={{ __html: dialogContent }} />
          </div>
        </div>
      )}
    </form>
  );
}
