import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotificationsForRole } from "@/lib/notifications";
import { DEFAULT_FEEDBACK_QUESTIONS } from "@/lib/feedbackTemplate";
import { parseAsIST } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const activeOnly = searchParams.get("active") === "1";

  const forms = await prisma.eventFeedbackForm.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: {
      _count: { select: { submissions: true, questions: true } },
      avenue: { select: { id: true, name: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { eventName, eventDate, isActive, allowResubmit, feedbackOpenAt, feedbackCloseAt, useTemplate, avenueId, isPublic } = body;

  if (!eventName?.trim() || !eventDate) {
    return NextResponse.json({ error: "eventName and eventDate are required" }, { status: 400 });
  }

  const form = await prisma.$transaction(async (tx) => {
    const f = await tx.eventFeedbackForm.create({
      data: {
        eventName: eventName.trim(),
        eventDate: new Date(eventDate),
        isActive: isActive ?? false,
        allowResubmit: allowResubmit ?? false,
        feedbackOpenAt: feedbackOpenAt ? parseAsIST(feedbackOpenAt) : null,
        feedbackCloseAt: feedbackCloseAt ? parseAsIST(feedbackCloseAt) : null,
        avenueId: avenueId || null,
        isPublic: isPublic ?? false,
      },
    });
    if (useTemplate) {
      await tx.eventFeedbackQuestion.createMany({
        data: DEFAULT_FEEDBACK_QUESTIONS.map((q) => ({ ...q, formId: f.id })),
      });
    }
    return f;
  });

  // Notify clubs (always) and DCMs (only in the targeted avenue, if set) if active
  if (isActive) {
    const msg = `A new feedback form is available: "${eventName.trim()}"`;
    await createNotificationsForRole("CLUB", "New Feedback Form", msg, `/club/feedback/${form.id}`);
    if (avenueId) {
      const avenueDcmUsers = await prisma.user.findMany({
        where: { role: "DCM", avenueId, isActive: true },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: avenueDcmUsers.map((u) => ({
          userId: u.id,
          title: "New Feedback Form",
          message: msg,
          link: `/dcm/feedback/${form.id}`,
        })),
      });
    } else {
      await createNotificationsForRole("DCM", "New Feedback Form", msg, `/dcm/feedback/${form.id}`);
    }
  }

  return NextResponse.json(form, { status: 201 });
}
