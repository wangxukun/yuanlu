import { lusitana } from "@/components/fonts";
import { CreatePodcastBtn } from "@/components/dashboard/buttons";
import Search from "@/components/search";
import React, { Suspense } from "react";
import PodcastsTable from "@/components/dashboard/podcasts/podcastsTable";

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>播客管理</h1>
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
