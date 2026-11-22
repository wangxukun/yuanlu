import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// Clips without an individual audio asset can still be read as the user's first relay leg.
export function sceneStarterId(
  sceneid: string,
  startSeconds: number,
  subtitleId: unknown,
) {
  const key =
    typeof subtitleId === "number" && Number.isSafeInteger(subtitleId)
      ? `s${subtitleId}`
      : `t${Math.round(startSeconds * 1000)}`;
  return `ms:${sceneid}:${key}`;
}

export async function loadSceneStarters(ids: string[]) {
  const byScene = new Map<string, Set<string>>();
  for (const id of ids) {
    const parts = /^ms:([\w-]+):[st]\d+$/.exec(id);
    if (!parts || id.length > 64) continue;
    const wanted = byScene.get(parts[1]) ?? new Set<string>();
    wanted.add(id);
    byScene.set(parts[1], wanted);
  }
  if (!byScene.size) return [];
  const scenes = await prisma.micro_scenes.findMany({
    where: { sceneid: { in: [...byScene.keys()] } },
    select: {
      sceneid: true,
      episodeid: true,
      clipsJson: true,
      title: true,
      situationTag: true,
      cefrLevel: true,
    },
  });
  return scenes.flatMap((scene) => {
    const clips = (scene.clipsJson as Prisma.JsonObject | null)?.clips;
    if (!Array.isArray(clips)) return [];
    return clips.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return [];
      const { start, end, textEn } = row;
      if (
        typeof start !== "number" ||
        typeof end !== "number" ||
        end <= start ||
        typeof textEn !== "string" ||
        !textEn.trim()
      )
        return [];
      const clipid = sceneStarterId(scene.sceneid, start, row.subtitleId);
      if (!byScene.get(scene.sceneid)?.has(clipid)) return [];
      return [
        {
          clipid,
          linkedClipId: typeof row.clipid === "string" ? row.clipid : null,
          episodeid: scene.episodeid,
          subtitleId:
            typeof row.subtitleId === "number" ? row.subtitleId : null,
          startTime: start,
          endTime: end,
          duration: end - start,
          enText: textEn,
          zhText: typeof row.textCn === "string" ? row.textCn : null,
          wordsJson: row.words ?? null,
          sourceLabel: scene.title,
          cefrLevel: scene.cefrLevel,
          wpm: 0,
          speaker: null,
          topicTags: scene.situationTag ? [scene.situationTag] : [],
        },
      ];
    });
  });
}
