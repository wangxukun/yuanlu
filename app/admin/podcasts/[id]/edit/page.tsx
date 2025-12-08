import { Metadata } from "next";
import Breadcrumbs from "@/components/admin/breadcrumbs";

export const metadata: Metadata = {
  title: "Edit Invoice",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "播客", href: "/admin/podcasts" },
          {
            label: "编辑播客",
            href: `/admin/podcasts/${id}/edit`,
            active: true,
          },
        ]}
      />
      <h1 className="mb-4 text-2xl font-bold">编辑播客有待完成</h1>
    </main>
  );
}
