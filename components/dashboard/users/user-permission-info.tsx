import { User } from "@/app/types/user";

export default async function UserPermissionInfo({ user }: { user: User }) {
  return (
    <>
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-6">
        <div className="flex flex-col items-start justify-start space-y-4">
          <h2 className="text-lg font-bold text-slate-500">当前用户权限信息</h2>
          <ul className="space-y-3 pl-4 text-slate-400">
            <li>用户账号{user.phone}</li>
            <li>用户角色：{user.role}</li>
            <li>评论权限：{user.isCommentAllowed ? "允许" : "禁止"}</li>
          </ul>
        </div>
      </div>
    </>
  );
}
