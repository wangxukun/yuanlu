import { lusitana } from "@/components/fonts";
import Search from "@/components/search";
import React, { Suspense } from "react";
import { TagGroupsTable } from "@/components/dashboard/tag-groups/tag-groups-table";
import { CreateTagGroupBtn } from "@/components/dashboard/buttons";

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>标签分组</h1>
      </div>
      <Suspense>
        <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
          <Search placeholder="搜索标签分组..." />
          <CreateTagGroupBtn />
        </div>
        <TagGroupsTable />
      </Suspense>
    </div>
  );
}
