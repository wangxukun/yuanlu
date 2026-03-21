import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";
import { notificationService } from "@/core/notification/notification.service";

export const metadata = {
  title: "消息通知 - 远路播客",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.userid) {
    redirect("/home");
  }

  const { userid } = session.user;
  const initialData = await notificationService.getNotifications(userid);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">消息通知</h1>
      <NotificationsClient initialData={initialData} />
    </div>
  );
}
