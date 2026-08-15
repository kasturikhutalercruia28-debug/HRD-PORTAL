import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DONE_STATUSES = ["conducted", "feedback_submitted", "certificate_generated"];

export async function GET() {
  const session = await auth();
  const user = session?.user as { role?: string; clubId?: string } | undefined;
  if (!user || user.role !== "CLUB" || !user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({ where: { id: user.clubId } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const [presSecDone, coreDone] = await Promise.all([
    prisma.orientationRequest.findFirst({
      where: { clubId: user.clubId, orientationType: "pres_sec", status: { in: DONE_STATUSES as never } },
    }),
    prisma.orientationRequest.findFirst({
      where: { clubId: user.clubId, orientationType: "core_member", status: { in: DONE_STATUSES as never } },
    }),
  ]);

  return NextResponse.json({
    presSecCompleted: !!presSecDone,
    coreCompleted: !!coreDone,
  });
}
