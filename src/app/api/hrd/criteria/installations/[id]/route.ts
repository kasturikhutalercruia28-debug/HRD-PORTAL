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
  const { clubName, date, attendeeDcmIds } = body;
  if (!clubName || !date || !Array.isArray(attendeeDcmIds) || attendeeDcmIds.length === 0) {
    return NextResponse.json({ error: "clubName, date, and at least one attendeeDcmId are required" }, { status: 400 });
  }

  try {
    const updated = await prisma.installation.update({
      where: { id: params.id },
      data: { clubName, date: new Date(date), attendeeDcmIds },
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
    await prisma.installation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
}
