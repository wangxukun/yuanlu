import React from "react";
import PodcastForm from "@/components/admin/podcasts/podcast-form";
import { updatePodcast } from "@/lib/actions";
import { getAdminPodcast } from "@/lib/admin-podcasts-service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPodcastPage(props: PageProps) {
  const params = await props.params;
  const { id } = params;

  // 2. 转换数据格式以适配表单
  const initialData = await getAdminPodcast(id);

  // 3. 绑定 Server Action ID (关键步骤)
  const updatePodcastWithId = updatePodcast.bind(null, id);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      {/* 渲染表单 */}
      <PodcastForm
        initialData={initialData}
        formAction={updatePodcastWithId}
        mode="edit"
      />
    </div>
  );
}
