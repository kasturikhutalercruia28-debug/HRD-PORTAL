import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeJsonFile } from "@/lib/githubStore";
import { OCVS_PATH, OcvRecord } from "@/lib/criteria";

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
  const { clubName, date, attendeeDcmIds } = body;
  if (!clubName || !date || !Array.isArray(attendeeDcmIds) || attendeeDcmIds.length === 0) {
    return NextResponse.json({ error: "clubName, date, and at least one attendeeDcmId are required" }, { status: 400 });
  }

  let resultRecord: OcvRecord | null = null;
  try {
    await writeJsonFile<OcvRecord[]>(
      OCVS_PATH,
      (current) => {
        const idx = current.findIndex((r) => r.id === params.id);
        if (idx === -1) return current;
        const next = [...current];
        next[idx] = { ...next[idx], clubName, date, attendeeDcmIds };
        resultRecord = next[idx];
        return next;
      },
      [],
      token,
      `Edit OCV attendance: ${clubName} (${date})`
    );
  } catch (e) {
    return NextResponse.json({ error: `GitHub save failed: ${(e as Error).message}` }, { status: 502 });
  }

  if (!resultRecord) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json(resultRecord);
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

  let found = false;
  try {
    await writeJsonFile<OcvRecord[]>(
      OCVS_PATH,
      (current) => {
        if (!current.some((r) => r.id === params.id)) return current;
        found = true;
        return current.filter((r) => r.id !== params.id);
      },
      [],
      token,
      `Delete OCV attendance record ${params.id}`
    );
  } catch (e) {
    return NextResponse.json({ error: `GitHub save failed: ${(e as Error).message}` }, { status: 502 });
  }

  if (!found) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
