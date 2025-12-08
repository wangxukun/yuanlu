import { CreatePodcastBtn } from "@/components/admin/buttons";
import Search from "@/components/search";
import React, { Suspense } from "react";
import PodcastsTable from "@/components/admin/podcasts/podcastsTable";

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <div className="breadcrumbs text-xl">
          <ul>
            <li>播客管理</li>
          </ul>
        </div>
      </div>
      <Suspense>
        <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
          <Search placeholder="搜索播客资源..." />
          <CreatePodcastBtn />
        </div>

        <PodcastsTable />
      </Suspense>

      {/*<div className="mt-5 flex w-full justify-center">*/}
      {/*    <Pagination totalPages={totalPages} />*/}
      {/*</div>*/}
    </div>
  );
}
