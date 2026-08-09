import { readJsonFile } from "@/lib/githubStore";

export type OrientationStage = "pres_sec" | "core" | "bod" | "everyone";

export interface MeetingLog {
  id: string;
  date: string | null; // null when isRevertAwaited
  isRevertAwaited: boolean;
  mode: "online" | "offline" | null;
  meetingWith: string;
  takenBy: string;
  discussion: string;
}

export interface ProgressEntry {
  id: string;
  clubName: string;
  stage: OrientationStage;
  status: "in_progress" | "completed";
  meetings: MeetingLog[];
  createdAt: string;
  updatedAt: string;
}

export const PROGRESS_PATH = "data/orientation-progress.json";

export const STAGE_LABELS: Record<OrientationStage, string> = {
  pres_sec: "Pres/Sec",
  core: "Core",
  bod: "BOD",
  everyone: "Everyone",
};

export async function getAllProgress(): Promise<ProgressEntry[]> {
  const { data } = await readJsonFile<ProgressEntry[]>(PROGRESS_PATH, []);
  return data;
}

export function isStageCompleted(entries: ProgressEntry[], clubName: string, stage: OrientationStage): boolean {
  return entries.some(
    (e) => e.clubName === clubName && e.stage === stage && e.status === "completed"
  );
}
