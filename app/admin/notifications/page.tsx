import SystemNotificationForm from "@/components/admin/notifications/SystemNotificationForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "发送系统通知",
};

export default function AdminNotificationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex w-full items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">系统公告与全局通知</h1>
      </div>

      <div className="mt-4">
        <p className="text-base-content/70 mb-6 max-w-2xl text-sm leading-relaxed">
          在此处发送系统级别的通知。这可以是一条面向所有用户的产品更新公告，也可以是仅针对部分特定用户的单独系统通知。所有触发的系统通知将会直接发送至用户的应用内收件箱。
        </p>

        <SystemNotificationForm />
      </div>
    </div>
  );
}
