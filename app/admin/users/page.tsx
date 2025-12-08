import Search from "@/components/search";
import React, { Suspense } from "react";
import UsersTable from "@/components/admin/users/usersTable";

export default async function Page() {
  return (
    <div className="w-full">
      <Suspense>
        <div className="flex items-center justify-between gap-2">
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
