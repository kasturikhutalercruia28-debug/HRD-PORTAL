import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user || (user.role !== "HRD" && user.role !== "DRR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.eventFeedbackSubmission.findMany({
    where: { formId: params.id },
    include: {
      submitter: { select: { id: true, name: true, role: true } },
      responses: {
        include: { question: true },
        orderBy: { question: { displayOrder: "asc" } },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
  // Note: respondentName + deviceId are plain columns on EventFeedbackSubmission,
  // already included by default in findMany — no extra select needed.

  return NextResponse.json(submissions);
}
