import ProgramSummarize from "@/components/category/ProgramSummarize";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center ...">
      <div className="w-96 flex-none p-2 pt-4 justify-self-end">
        <ProgramSummarize
          title="6 Minute English"
          episodes={544}
          publisher="BBC Learning English"
          description="《6 Minute English》是由BBC Learning English出品的一档英语学习播客，专为希望提升英语听力和语言技能的人打造。每集节目时长只有6分钟，以简短但信息量丰富的方式，讨论当下的社会、文化、科技、环境等各种热门话题，让听众在短时间内既能学习到新词汇和表达方式，又能获取时事知识。"
          imageUrl="/static/images/2.png"
          initialCollected={false}
        />
      </div>
      <div className="justify-self-start md:overflow-y-auto">{children}</div>
    </div>
  );
}
