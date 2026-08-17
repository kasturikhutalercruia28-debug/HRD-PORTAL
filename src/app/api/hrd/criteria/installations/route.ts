import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const records = await prisma.installation.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { clubName, date, attendeeDcmIds } = body;
  if (!clubName || !date || !Array.isArray(attendeeDcmIds) || attendeeDcmIds.length === 0) {
    return NextResponse.json(
      { error: "clubName, date, and at least one attendeeDcmId are required" },
      { status: 400 }
    );
  }

  const record = await prisma.installation.create({
    data: { clubName, date: new Date(date), attendeeDcmIds },
  });

  return NextResponse.json(record, { status: 201 });
}
