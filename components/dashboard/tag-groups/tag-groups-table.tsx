import { fetchTagGroups } from "@/lib/data";
import { TagGroup } from "@/core/tag/tag.entity";

export async function TagGroupsTable() {
  const tagGroups = ((await fetchTagGroups()) as TagGroup[]) || [];
  const tagTypes = {
    PODCAST: "播客",
    EPISODE: "剧集",
    UNIVERSAL: "通用",
  };

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-3 py-5 font-medium">
                  标签分组名称
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  描述
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  标签数
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  允许的标签类型
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  排序权重
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {tagGroups?.map((group) => (
                <tr
                  key={group.groupid}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap px-3 py-3">{group.name}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {group.description}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {group.tagLinks.length}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {group.allowedTypes.map((type) => (
                      <span key={type}>{tagTypes[type]}</span>
                    ))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {group.sortOrder}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex justify-end gap-3">
                      {/*<ReadUserBtn id={tag.tagid} />*/}
                      {/*<UpdateUserBtn id={tag.tagid} />*/}
                      {/*<DeleteUserBtn id={tag.tagid} avatarFileName={} />*/}
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
