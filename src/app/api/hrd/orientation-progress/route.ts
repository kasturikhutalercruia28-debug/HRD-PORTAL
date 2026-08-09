import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readJsonFile, writeJsonFile } from "@/lib/githubStore";
import { PROGRESS_PATH, ProgressEntry, MeetingLog } from "@/lib/orientationProgress";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data } = await readJsonFile<ProgressEntry[]>(PROGRESS_PATH, []);
  return NextResponse.json(data.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = req.headers.get("x-hrd-github-token");
  if (!token) {
    return NextResponse.json({ error: "Missing GitHub token — set it up once from the DCM Criteria page." }, { status: 400 });
  }

  const body = await req.json();
  const { clubName, stage, meetings, status } = body;
  if (!clubName || !stage) {
    return NextResponse.json({ error: "clubName and stage are required" }, { status: 400 });
  }

  const { data } = await readJsonFile<ProgressEntry[]>(PROGRESS_PATH, []);

  const now = new Date().toISOString();
  const record: ProgressEntry = {
    id: `prog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    clubName,
    stage,
    status: status === "completed" ? "completed" : "in_progress",
    meetings: Array.isArray(meetings)
      ? meetings.map((m: Partial<MeetingLog>) => ({
          id: `mtg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          date: m.date ?? null,
          isRevertAwaited: !!m.isRevertAwaited,
          mode: m.mode ?? null,
          meetingWith: m.meetingWith ?? "",
          takenBy: m.takenBy ?? "",
          discussion: m.discussion ?? "",
        }))
      : [],
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...data, record];
  try {
    await writeJsonFile(PROGRESS_PATH, updated, token, `Add orientation progress: ${clubName} (${stage})`);
  } catch (e) {
    return NextResponse.json({ error: `GitHub save failed: ${(e as Error).message}` }, { status: 502 });
  }

  return NextResponse.json(record, { status: 201 });
}
