import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const records = await prisma.project.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, date, avenue, chairDcmIds, coreDcmIds, hodDcmIds } = body;
  if (!name || !date || !avenue) {
    return NextResponse.json({ error: "name, date, and avenue are required" }, { status: 400 });
  }

  const record = await prisma.project.create({
    data: {
      name,
      date: new Date(date),
      avenue,
      chairDcmIds: Array.isArray(chairDcmIds) ? chairDcmIds : [],
      coreDcmIds: Array.isArray(coreDcmIds) ? coreDcmIds : [],
      hodDcmIds: Array.isArray(hodDcmIds) ? hodDcmIds : [],
    },
  });

  return NextResponse.json(record, { status: 201 });
}
