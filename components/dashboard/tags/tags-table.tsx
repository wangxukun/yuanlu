import { fetchTags } from "@/lib/data";
import { Tag } from "@/core/tag/tag.entity";

export async function TagsTable() {
  const tags = ((await fetchTags()) as Tag[]) || [];
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-3 py-5 font-medium">
                  标签名称
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  分类
                </th>
                <th scope="col" className="px-7 py-5 font-medium">
                  所属标签组
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  描述
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {tags?.map((tag) => (
                <tr
                  key={tag.tagid}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap px-3 py-3">{tag.name}</td>
                  <td className="whitespace-nowrap px-3 py-3">{tag.type}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {tag.groupLinks.length > 0 &&
                      tag.groupLinks.map((g_t) => (
                        <span key={g_t.tagid} className="px-2">
                          {g_t.group.name}
                        </span>
                      ))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {tag.description}
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
