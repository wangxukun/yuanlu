import React from "react";
import { Metadata } from "next";
import { adminDictionaryService } from "@/core/admin/dictionary.service";
import DictionaryTableClient from "./DictionaryTableClient";

export const metadata: Metadata = {
  title: "词典管理",
};

export default async function Page(props: {
  searchParams?: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const page = Number(searchParams?.page) || 1;
  const pageSize = 20;

  const { total, data } = await adminDictionaryService.getDictionaryList(
    page,
    pageSize,
    q,
  );

  return (
    <div className="w-full flex flex-col gap-4">
      <h1 className="text-2xl font-bold">词典管理</h1>
      <DictionaryTableClient
        initialData={data}
        total={total}
        currentPage={page}
        pageSize={pageSize}
        searchQuery={q}
      />
    </div>
  );
}
