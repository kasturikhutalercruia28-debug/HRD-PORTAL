import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllProgress, isStageCompleted } from "@/lib/orientationProgress";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const user = session?.user as { role?: string; clubId?: string } | undefined;
  if (!user || user.role !== "CLUB" || !user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({ where: { id: user.clubId } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  let presSecCompleted = false;
  try {
    const progress = await getAllProgress();
    presSecCompleted = isStageCompleted(progress, club.name, "pres_sec");
  } catch {
    // If the progress tracker is unreachable, fail open on pres_sec so a
    // temporary GitHub hiccup never permanently blocks a club from booking.
    presSecCompleted = true;
  }

  const completedCoreRequest = await prisma.orientationRequest.findFirst({
    where: {
      clubId: user.clubId,
      orientationType: "core_member",
      status: { in: ["conducted", "feedback_submitted", "certificate_generated"] },
    },
  });

  return NextResponse.json({
    presSecCompleted,
    coreCompleted: !!completedCoreRequest,
  });
}
