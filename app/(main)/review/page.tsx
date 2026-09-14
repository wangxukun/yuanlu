import { redirect } from "next/navigation";

/** 复习中心默认落地：生词本 */
export default function ReviewIndexPage() {
  redirect("/review/vocabulary");
}
