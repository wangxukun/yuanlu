import {
  DAILY_VERSION,
  MAX_WINDOWS,
  chinaDate,
  dailySeed,
  selectDaily,
  windowPivot,
  type DailyClip,
  type DailyInput,
  type HistoryItem,
  type Selection,
} from "./daily-challenge.core";

export type DailyAssignment = Selection & {
  id: string | null;
  date: string;
  algorithmVersion: string;
  seedDigest: string;
};
export interface DailyChallengeDeps {
  secret: string;
  findAssignment(userid: string, date: string): Promise<DailyAssignment | null>;
  /** Atomic insert-if-absent, returning the committed winner, not the losing proposal. */
  saveAssignment(
    userid: string,
    assignment: DailyAssignment,
  ): Promise<DailyAssignment>;
  history(userid: string, date: string): Promise<HistoryItem[]>;
  vocabulary(userid: string): Promise<string[]>;
  sample(
    pivot: string,
    userid: string | null,
    premium: boolean,
  ): Promise<DailyClip[]>;
  observe?(metrics: {
    durationMs: number;
    windows: number;
    candidates: number;
    status: string;
    fallbackStage: string;
    samplingReason: string;
  }): void;
}

export async function getDailyAssignment(
  input: DailyInput,
  user: { userid: string; premium: boolean } | null,
  deps: DailyChallengeDeps,
  now = new Date(),
): Promise<DailyAssignment> {
  const date = chinaDate(now);
  if (user) {
    const saved = await deps.findAssignment(user.userid, date);
    if (saved) return saved;
  } else if (!input.anonymousId) throw new Error("ANONYMOUS_ID_REQUIRED");
  const startedAt = Date.now();
  const seed = dailySeed(
    deps.secret,
    user ? `user:${user.userid}` : `guest:${input.anonymousId}`,
    date,
  );
  const [history, vocabulary] = user
    ? await Promise.all([
        deps.history(user.userid, date),
        deps.vocabulary(user.userid),
      ])
    : [[], []];
  const context = {
    date,
    seed,
    history: [...history, ...input.localHistory],
    vocabulary,
    levels: input.levels,
  };
  const clips: DailyClip[] = [];
  let windows = 0;
  let selection: Selection = {
    items: [],
    status: "empty",
    fallbackStage: "normal",
  };
  // Four independent, bounded indexed windows per round. No unbounded anti-join/COUNT/OFFSET.
  for (let start = 0; start < MAX_WINDOWS; start += 4) {
    const batches = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        deps.sample(
          windowPivot(seed, start + i),
          user?.userid || null,
          user?.premium || false,
        ),
      ),
    );
    clips.push(...batches.flat());
    windows += 4;
    selection = selectDaily(clips, context, false);
    if (selection.status === "complete") break;
  }
  if (selection.status !== "complete")
    selection = selectDaily(clips, context, true);
  const assignment: DailyAssignment = {
    ...selection,
    id: null,
    date,
    algorithmVersion: DAILY_VERSION,
    seedDigest: seed,
  };
  deps.observe?.({
    durationMs: Date.now() - startedAt,
    windows,
    candidates: new Set(clips.map((c) => c.clipid)).size,
    status: selection.status,
    fallbackStage: selection.fallbackStage,
    samplingReason:
      selection.fallbackStage === "normal"
        ? "normal"
        : "sample_budget_exhausted",
  });
  // Persist partial/empty too: retries must not silently change today's assignment.
  return user ? deps.saveAssignment(user.userid, assignment) : assignment;
}
