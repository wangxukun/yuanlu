import Image from "next/image";
import { fetchPodcasts } from "@/app/lib/fetchSubtitles";
import {
  DeletePodcastBtn,
  UpdatePodcastBtn,
} from "@/components/dashboard/buttons";
import { Podcast } from "@/app/types/podcast";

export default async function PodCastsTable() {
  const podcasts = ((await fetchPodcasts()) as Podcast[]) || [];

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {podcasts?.map((podcast) => (
              <div
                key={podcast.podcastid}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-2 flex items-center">
                      {podcast.title}
                    </div>
                    <p className="text-sm text-gray-500">{podcast.platform}</p>
                  </div>
                  <div className="h-8 w-28">按钮在此处</div>
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>{podcast.description}</div>
                  <div className="flex justify-end gap-2">
                    <Image
                      src={podcast.coverUrl || "/static/images/1.png"}
                      alt={`${podcast.title}封面`}
                      width={100}
                      height={60}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-7 py-5 ">
                  封面图片
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  标题
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  发布平台
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  描述
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {podcasts?.map((podcast) => (
                <tr
                  key={podcast.podcastid}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      {/* 添加relative容器和样式调整 */}
                      <div className="relative h-[60px] w-[100px]">
                        <Image
                          src={podcast.coverUrl || "/static/images/1.png"}
                          alt={`${podcast.title}封面`}
                          fill // 填充整个父容器
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover" // 添加填充方式
                        />
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {podcast.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {podcast.platform}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="line-clamp-2 break-words max-w-xs">
                      <span className="inline-block w-full">
                        {podcast.description}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex justify-end gap-3">
                      <UpdatePodcastBtn id={podcast.podcastid} />
                      <DeletePodcastBtn
                        id={podcast.podcastid}
                        coverFileName={podcast.coverFileName || ""}
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
