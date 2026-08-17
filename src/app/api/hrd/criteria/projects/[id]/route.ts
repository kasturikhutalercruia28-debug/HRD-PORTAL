import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, date, avenue, chairDcmIds, coreDcmIds, hodDcmIds } = body;
  if (!name || !date || !avenue) {
    return NextResponse.json({ error: "name, date, and avenue are required" }, { status: 400 });
  }

  try {
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        name,
        date: new Date(date),
        avenue,
        chairDcmIds: Array.isArray(chairDcmIds) ? chairDcmIds : [],
        coreDcmIds: Array.isArray(coreDcmIds) ? coreDcmIds : [],
        hodDcmIds: Array.isArray(hodDcmIds) ? hodDcmIds : [],
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
}
