import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ImportEntry {
  clubName: string;
  date: string; // ISO date
  attendeeDcmIds: string[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const entries: ImportEntry[] = body?.entries;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  for (const e of entries) {
    if (!e.clubName || !e.date || !Array.isArray(e.attendeeDcmIds) || e.attendeeDcmIds.length === 0) {
      return NextResponse.json(
        { error: `Invalid entry for club "${e.clubName ?? "unknown"}" — needs a date and at least one attendee.` },
        { status: 400 }
      );
    }
  }

  // Validate DCM ids actually exist, so a bad match in the review screen
  // doesn't silently write a dangling id into attendeeDcmIds.
  const allDcmIds = Array.from(new Set(entries.flatMap((e) => e.attendeeDcmIds)));
  const validDcms = await prisma.dcm.findMany({
    where: { id: { in: allDcmIds } },
    select: { id: true },
  });
  const validIdSet = new Set(validDcms.map((d) => d.id));
  const unknownIds = allDcmIds.filter((id) => !validIdSet.has(id));
  if (unknownIds.length > 0) {
    return NextResponse.json(
      { error: `${unknownIds.length} DCM id(s) in the import don't exist in the database. Re-check the matching step.` },
      { status: 400 }
    );
  }

  const result = await prisma.installation.createMany({
    data: entries.map((e) => ({
      clubName: e.clubName.trim(),
      date: new Date(e.date),
      attendeeDcmIds: e.attendeeDcmIds,
    })),
  });

  return NextResponse.json({ created: result.count }, { status: 201 });
}
