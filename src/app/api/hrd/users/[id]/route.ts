import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "HRD") {
    return NextResponse.json({ error: "Cannot modify HRD users" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: !user.isActive },
    include: { avenue: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ user: updated });
}
