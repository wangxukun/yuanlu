import { Metadata } from "next";
import ContactClient from "./ContactClient"; // 引入拆分出去的客户端组件

export const metadata: Metadata = {
  title: "联系我们 | 远路",
  description: "有任何问题或建议？欢迎发送邮件与我们联系。",
};

export default function ContactPage() {
  return <ContactClient />;
}
