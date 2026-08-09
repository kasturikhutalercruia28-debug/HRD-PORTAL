import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readJsonFile, writeJsonFile } from "@/lib/githubStore";
import { PROGRESS_PATH, ProgressEntry, MeetingLog } from "@/lib/orientationProgress";

export const dynamic = "force-dynamic";

function getToken(req: NextRequest) {
  return req.headers.get("x-hrd-github-token");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = getToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing GitHub token — set it up once from the DCM Criteria page." }, { status: 400 });
  }

  const body = await req.json();
  const { data } = await readJsonFile<ProgressEntry[]>(PROGRESS_PATH, []);
  const idx = data.findIndex((r) => r.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const current = data[idx];
  const updatedRecord: ProgressEntry = {
    ...current,
    status: body.status ?? current.status,
    meetings: Array.isArray(body.meetings)
      ? body.meetings.map((m: Partial<MeetingLog>) => ({
          id: m.id || `mtg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          date: m.date ?? null,
          isRevertAwaited: !!m.isRevertAwaited,
          mode: m.mode ?? null,
          meetingWith: m.meetingWith ?? "",
          takenBy: m.takenBy ?? "",
          discussion: m.discussion ?? "",
        }))
      : current.meetings,
    updatedAt: new Date().toISOString(),
  };

  const updated = [...data];
  updated[idx] = updatedRecord;

  try {
    await writeJsonFile(PROGRESS_PATH, updated, token, `Update orientation progress: ${current.clubName} (${current.stage})`);
  } catch (e) {
    return NextResponse.json({ error: `GitHub save failed: ${(e as Error).message}` }, { status: 502 });
  }

  return NextResponse.json(updatedRecord);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = getToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing GitHub token — set it up once from the DCM Criteria page." }, { status: 400 });
  }

  const { data } = await readJsonFile<ProgressEntry[]>(PROGRESS_PATH, []);
  const record = data.find((r) => r.id === params.id);
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const updated = data.filter((r) => r.id !== params.id);
  try {
    await writeJsonFile(PROGRESS_PATH, updated, token, `Delete orientation progress: ${record.clubName} (${record.stage})`);
  } catch (e) {
    return NextResponse.json({ error: `GitHub save failed: ${(e as Error).message}` }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
