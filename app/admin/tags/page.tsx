import { lusitana } from "@/components/fonts";
import Search from "@/components/search";
import React, { Suspense } from "react";
import { TagsTable } from "@/components/admin/tags/tags-table";
import { CreateTagBtn } from "@/components/admin/buttons";

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>标签管理</h1>
      </div>
      <Suspense>
        <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
          <Search placeholder="搜索标签..." />
          <CreateTagBtn />
        </div>
        <TagsTable />
      </Suspense>
    </div>
  );
}
