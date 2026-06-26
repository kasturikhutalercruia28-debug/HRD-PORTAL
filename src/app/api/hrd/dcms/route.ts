import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const avenueId = searchParams.get("avenueId");

  const dcms = await prisma.dcm.findMany({
    where: avenueId ? { avenueId } : undefined,
    include: {
      avenue: { select: { id: true, name: true } },
    },
    orderBy: [{ avenue: { displayOrder: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ dcms });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, title, avenueId } = body;

  if (!name || !title || !avenueId) {
    return NextResponse.json({ error: "name, title, and avenueId are required" }, { status: 400 });
  }

  const avenue = await prisma.avenue.findUnique({ where: { id: avenueId } });
  if (!avenue) {
    return NextResponse.json({ error: "Avenue not found" }, { status: 404 });
  }

  const dcm = await prisma.dcm.create({
    data: {
      name,
      title,
      avenueId,
      isActive: true,
      joinedAt: new Date(),
    },
    include: {
      avenue: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ dcm }, { status: 201 });
}
