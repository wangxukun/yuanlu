"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { contactSchema, ContactFormValues } from "@/lib/form-schema";
import { ZodError } from "zod";

export default function ContactPage() {
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
    const baseClass = "w-full transition-all";
    if (errors[fieldName]) {
      return `${baseClass} input input-bordered input-error focus:input-error bg-error/5`;
    }
    return `${baseClass} input input-bordered focus:input-primary`;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm p-6 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            联系我们
          </h1>
          <p className="text-base-content/70">
            如果您有任何建议、问题或合作意向，欢迎发送邮件与我联系。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 邮箱字段 */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">您的邮箱</span>
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
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-error">
                  <AlertCircle size={18} />
                </div>
              )}
            </div>
            {errors.email && (
              <label className="label py-1">
                <span className="label-text-alt text-error">
                  {errors.email}
                </span>
              </label>
            )}
          </div>

          {/* 主题字段 */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">主题</span>
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
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-error">
                  <AlertCircle size={18} />
                </div>
              )}
            </div>
            {errors.subject && (
              <label className="label py-1">
                <span className="label-text-alt text-error">
                  {errors.subject}
                </span>
              </label>
            )}
          </div>

          {/* 留言内容字段 */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">留言内容</span>
            </label>
            <textarea
              name="message"
              placeholder="请输入您想说的内容（至少10个字符）..."
              className={`textarea textarea-bordered h-32 text-base transition-all ${
                errors.message
                  ? "textarea-error focus:textarea-error bg-error/5"
                  : "focus:textarea-primary"
              }`}
              value={formData.message}
              onChange={handleChange}
              onBlur={handleBlur}
            ></textarea>
            <div className="flex justify-between items-start mt-1">
              {errors.message ? (
                <span className="label-text-alt text-error flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.message}
                </span>
              ) : (
                <span></span>
              )}
              <span
                className={`label-text-alt ${formData.message.length > 1000 ? "text-error" : "text-base-content/50"}`}
              >
                {formData.message.length}/1000
              </span>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="pt-2">
            <button
              type="submit"
              // 按钮禁用条件：正在加载 OR 表单无效
              disabled={isLoading || !isFormValid}
              className="btn btn-primary w-full text-lg disabled:bg-base-300 disabled:text-base-content/50 disabled:cursor-not-allowed"
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
              <p className="text-center text-xs text-base-content/40 mt-2">
                请完整填写所有字段后提交
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
