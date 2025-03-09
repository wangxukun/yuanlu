"use client";
// 新建客户端组件
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return <button onClick={() => signOut()}>Sign Out</button>;
}
