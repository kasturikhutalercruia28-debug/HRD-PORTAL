import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasDrrAccess } from "@/lib/access";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = session?.user as { role?: string; email?: string; avenueId?: string } | undefined;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isDistrictWide = user.role === "HRD" || hasDrrAccess(user);

  if (!isDistrictWide) {
    if (user.role !== "DEC" && user.role !== "DCM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const form = await prisma.eventFeedbackForm.findUnique({ where: { id: params.id } });
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // DEC/DCM can only see results for forms scoped specifically to their own avenue
    if (!form.avenueId || form.avenueId !== user.avenueId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

  return NextResponse.json(submissions);
}
