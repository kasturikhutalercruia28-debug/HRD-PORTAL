import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeJsonFile } from "@/lib/githubStore";
import { PROJECTS_PATH, ProjectRecord } from "@/lib/criteria";

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
  const { name, date, avenue, chairDcmIds, coreDcmIds, hodDcmIds } = body;
  if (!name || !date || !avenue) {
    return NextResponse.json({ error: "name, date, and avenue are required" }, { status: 400 });
  }

  let resultRecord: ProjectRecord | null = null;
  try {
    await writeJsonFile<ProjectRecord[]>(
      PROJECTS_PATH,
      (current) => {
        const idx = current.findIndex((r) => r.id === params.id);
        if (idx === -1) return current;
        const next = [...current];
        next[idx] = {
          ...next[idx],
          name,
          date,
          avenue,
          chairDcmIds: Array.isArray(chairDcmIds) ? chairDcmIds : [],
          coreDcmIds: Array.isArray(coreDcmIds) ? coreDcmIds : [],
          hodDcmIds: Array.isArray(hodDcmIds) ? hodDcmIds : [],
        };
        resultRecord = next[idx];
        return next;
      },
      [],
      token,
      `Edit project: ${name} (${date})`
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
    await writeJsonFile<ProjectRecord[]>(
      PROJECTS_PATH,
      (current) => {
        if (!current.some((r) => r.id === params.id)) return current;
        found = true;
        return current.filter((r) => r.id !== params.id);
      },
      [],
      token,
      `Delete project record ${params.id}`
    );
  } catch (e) {
    return NextResponse.json({ error: `GitHub save failed: ${(e as Error).message}` }, { status: 502 });
  }

  if (!found) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
