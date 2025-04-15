import ProgramList from "@/components/category/ProgramList";
import { fetchPodcastById } from "@/app/lib/data";
import ProgramSummarize from "@/components/category/ProgramSummarize";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const podcast = await fetchPodcastById(id);

  return (
    <main>
      <div className="flex flex-col justify-center ...">
        <div className="w-full flex-col p-2 pt-4 justify-self-end">
          <ProgramSummarize podcast={podcast} />
        </div>

        <div className="justify-self-start md:overflow-y-auto">
          <div className="pt-4 p-2">
            <ProgramList episodes={podcast.episode || []} />
          </div>
        </div>
      </div>
    </main>
  );
}
