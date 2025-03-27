import { Metadata } from "next";
import Breadcrumbs from "@/components/dashboard/breadcrumbs";

export const metadata: Metadata = {
  title: "Edit Episode",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "剧集", href: "/dashboard/episodes" },
          {
            label: "编辑剧集",
            href: `/dashboard/episodes/${id}/edit`,
            active: true,
          },
        ]}
      />
      <h1 className="mb-4 text-2xl font-bold">编辑剧集有待完成</h1>
    </main>
  );
}
