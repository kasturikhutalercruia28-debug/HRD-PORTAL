import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

const DONE_STATUSES = ["conducted", "feedback_submitted", "certificate_generated"];

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; clubId?: string } | undefined;

  if (!user || user.role !== "CLUB" || !user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    orientationType,
    expectedAttendance,
    preferredDate1,
    preferredTime1,
    preferredDate2,
    preferredTime2,
    preferredDate3,
    preferredTime3,
    answers, // { [questionId]: string }
  } = body;

  if (
    !orientationType ||
    !expectedAttendance ||
    !preferredDate1 || !preferredTime1 ||
    !preferredDate2 || !preferredTime2 ||
    !preferredDate3 || !preferredTime3
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const club = await prisma.club.findUnique({ where: { id: user.clubId } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // Enforce the sequencing rule server-side too (not just in the UI):
  // Core requires a completed Pres/Sec; BOD requires a completed Core.
  if (orientationType === "core_member") {
    const presSecDone = await prisma.orientationRequest.findFirst({
      where: { clubId: user.clubId, orientationType: "pres_sec", status: { in: DONE_STATUSES as never } },
    });
    if (!presSecDone) {
      return NextResponse.json(
        { error: "Complete your Pres/Sec orientation before booking Core orientation." },
        { status: 400 }
      );
    }
  }

  if (orientationType === "bod") {
    const coreDone = await prisma.orientationRequest.findFirst({
      where: { clubId: user.clubId, orientationType: "core_member", status: { in: DONE_STATUSES as never } },
    });
    if (!coreDone) {
      return NextResponse.json(
        { error: "Complete your Core orientation before booking BOD orientation." },
        { status: 400 }
      );
    }
  }

  const request = await prisma.$transaction(async (tx) => {
    const newReq = await tx.orientationRequest.create({
      data: {
        clubId: user.clubId!,
        orientationType,
        expectedAttendance: Number(expectedAttendance),
        preferredDate1: new Date(preferredDate1),
        preferredTime1,
        preferredDate2: new Date(preferredDate2),
        preferredTime2,
        preferredDate3: new Date(preferredDate3),
        preferredTime3,
      },
    });

    if (answers && typeof answers === "object") {
      const answerEntries = Object.entries(answers as Record<string, string>).filter(
        ([, v]) => v && v.trim()
      );
      if (answerEntries.length > 0) {
        await tx.orientationAnswer.createMany({
          data: answerEntries.map(([questionId, answerText]) => ({
            requestId: newReq.id,
            questionId,
            answerText: answerText.trim(),
          })),
        });
      }
    }

    return newReq;
  });

  return NextResponse.json({ id: request.id }, { status: 201 });
}
