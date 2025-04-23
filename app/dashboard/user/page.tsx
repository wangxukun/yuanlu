import { lusitana } from "@/components/fonts";
import Search from "@/components/search";
import React, { Suspense } from "react";
import UsersTable from "@/components/dashboard/user/usersTable";

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>用户管理</h1>
      </div>
      <Suspense>
        <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
          <Search placeholder="搜索用户..." />
        </div>
        <UsersTable />
      </Suspense>

      {/*<div className="mt-5 flex w-full justify-center">*/}
      {/*    <Pagination totalPages={totalPages} />*/}
      {/*</div>*/}
    </div>
  );
}
