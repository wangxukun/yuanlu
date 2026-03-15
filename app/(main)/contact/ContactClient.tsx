"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { contactSchema, ContactFormValues } from "@/lib/form-schema";
import { ZodError } from "zod";

export default function ContactClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState<ContactFormValues>({
    email: "",
    subject: "",
    message: "",
  });

  // 错误信息状态
  const [errors, setErrors] = useState<
    Partial<Record<keyof ContactFormValues, string>>
  >({});

  // 记录哪些字段被用户操作过（用于控制错误显示的对机：Blur时才显示）
  const [touched, setTouched] = useState<
    Partial<Record<keyof ContactFormValues, boolean>>
  >({});

  // 实时计算表单是否整体有效
  const isFormValid = useMemo(() => {
    return contactSchema.safeParse(formData).success;
  }, [formData]);

  // 通用验证函数
  const validateField = (name: keyof ContactFormValues, value: string) => {
    try {
      // 只验证当前字段
      contactSchema.shape[name].parse(value);
      // 验证通过，清除该字段的错误
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors((prev) => ({ ...prev, [name]: error.errors[0].message }));
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof ContactFormValues;

    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // 如果用户已经“触摸”过该字段，或者正在修正错误，则立即进行验证反馈
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof ContactFormValues;

    // 标记为已触摸
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    // 触发验证
    validateField(fieldName, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 提交前最后一次全量验证（防止用户通过开发者工具启用按钮）
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      toast.error("请修正表单中的错误");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "发送失败");
      }

      toast.success("留言已发送！我们会尽快回复您。");
      router.push("/");
    } catch (error) {
      // 将 error 断言为 Error 对象
      const errorMessage = (error as Error).message || "发送过程中出现错误";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 辅助函数：获取输入框的样式类名
  const getInputClass = (fieldName: keyof ContactFormValues) => {
    const baseClass = "w-full px-4 py-3 rounded-xl border outline-none transition-all placeholder:text-gray-300";
    if (errors[fieldName]) {
      return `${baseClass} border-red-300 focus:ring-2 focus:ring-red-500 bg-red-50/30 text-gray-900`;
    }
    return `${baseClass} border-gray-200 focus:ring-2 focus:ring-indigo-500 text-gray-900`;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="text-center px-8 py-8 border-b border-gray-50">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            联系我们
          </h1>
          <p className="text-sm text-gray-500">
            如果您有任何建议、问题或合作意向，欢迎发送邮件与我联系。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* 邮箱字段 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase block">
              您的邮箱 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                className={getInputClass("email")}
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.email && (
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                  <AlertCircle size={18} />
                </div>
              )}
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          {/* 主题字段 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase block">
              主题 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="subject"
                placeholder="关于..."
                className={getInputClass("subject")}
                value={formData.subject}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.subject && (
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                  <AlertCircle size={18} />
                </div>
              )}
            </div>
            {errors.subject && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                {errors.subject}
              </p>
            )}
          </div>

          {/* 留言内容字段 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-bold text-gray-500 uppercase block">
                留言内容 <span className="text-red-500">*</span>
              </label>
              <span className={`text-[10px] font-medium ${formData.message.length > 1000 ? "text-red-500" : "text-gray-400"}`}>
                {formData.message.length}/1000
              </span>
            </div>
            <textarea
              name="message"
              placeholder="请输入您想说的内容（至少10个字符）..."
              className={`${getInputClass("message")} h-32 resize-none`}
              value={formData.message}
              onChange={handleChange}
              onBlur={handleBlur}
            ></textarea>
            {errors.message && (
              <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                <AlertCircle size={14} /> {errors.message}
              </p>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="pt-6 border-t border-gray-50 flex flex-col items-center">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  发送留言
                </>
              )}
            </button>
            {!isFormValid && Object.keys(touched).length > 0 && (
              <p className="text-center text-xs text-gray-400 mt-2 font-medium">
                请完整填写所有必填字段后提交
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
