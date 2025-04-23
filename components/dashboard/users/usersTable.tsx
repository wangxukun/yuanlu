import { fetchUsers } from "@/app/lib/data";
import { User } from "@/app/types/user";
import {
  DeleteUserBtn,
  ReadUserBtn,
  UpdateUserBtn,
} from "@/components/dashboard/buttons";

export default async function UsersTable() {
  const users = ((await fetchUsers()) as User[]) || [];

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {users?.map((user) => (
              <div
                key={user.userid}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-2 flex items-center">{user.phone}</div>
                    <p className="text-sm text-gray-500">{user.role}</p>
                  </div>
                  <div className="h-8 w-28">按钮在此处</div>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-7 py-5 ">
                  用户电话
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  角色
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  语言
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  注册日期
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  更新日期
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  是否在线
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  最后活动时间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {users?.map((user) => (
                <tr
                  key={user.userid}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      {/* 添加relative容器和样式调整 */}
                      {user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{user.role}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {user.languagePreference}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {user.createAt.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {user.updateAt.toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    {user.isOnline ? "在线" : "离线"}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    {user.lastActiveAt?.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex justify-end gap-3">
                      <ReadUserBtn id={user.userid} />
                      <UpdateUserBtn id={user.userid} />
                      <DeleteUserBtn
                        id={user.userid}
                        avatarFileName={user.userProfile?.avatarFileName || ""}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
