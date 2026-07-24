import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const allowed = ["CLUB", "DCM"];
  const isLoggedInFlow = !!user?.id && !!user.role && allowed.includes(user.role);

  const form = await prisma.eventFeedbackForm.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  if (!form.isActive) return NextResponse.json({ error: "Form is not active" }, { status: 400 });

  // Anyone without a CLUB/DCM session can only submit if HRD made this form public.
  if (!isLoggedInFlow && !form.isPublic) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check open/close dates
  const now = new Date();
  if (form.feedbackOpenAt && now < form.feedbackOpenAt) {
    return NextResponse.json({ error: "Feedback is not open yet" }, { status: 400 });
  }
  if (form.feedbackCloseAt && now > form.feedbackCloseAt) {
    return NextResponse.json({ error: "Feedback period has closed" }, { status: 400 });
  }

  const body = await req.json();
  const { responses } = body; // { [questionId]: string }

  let respondentName: string | null = null;
  let deviceId: string | null = null;

  if (isLoggedInFlow) {
    // Existing logged-in flow: identity comes from the session.
    const existing = await prisma.eventFeedbackSubmission.findFirst({
      where: { formId: params.id, submittedBy: user!.id },
    });
    if (existing && !form.allowResubmit) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }
  } else {
    // Public/anonymous flow: name is required, and one submission per device.
    respondentName = body.respondentName?.toString().trim() || "";
    deviceId = body.deviceId?.toString().trim() || "";
    if (!respondentName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!deviceId) {
      return NextResponse.json({ error: "Missing device identifier" }, { status: 400 });
    }
    const existing = await prisma.eventFeedbackSubmission.findFirst({
      where: { formId: params.id, deviceId },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already submitted feedback for this form" }, { status: 409 });
    }
  }

  // Validate required questions
  const required = form.questions.filter((q) => q.isRequired);
  const missing = required.filter((q) => !responses?.[q.id]?.toString().trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required answers`, missing: missing.map((q) => q.id) },
      { status: 400 }
    );
  }

  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.eventFeedbackSubmission.create({
      data: isLoggedInFlow
        ? { formId: params.id, submittedBy: user!.id! }
        : { formId: params.id, respondentName, deviceId },
    });
    const entries = Object.entries(responses as Record<string, string>).filter(
      ([, v]) => v !== undefined && v !== null && String(v).trim() !== ""
    );
    if (entries.length > 0) {
      await tx.eventFeedbackResponse.createMany({
        data: entries.map(([questionId, answer]) => ({
          submissionId: sub.id,
          questionId,
          answer: String(answer).trim(),
        })),
      });
    }
    return sub;
  });

  return NextResponse.json({ id: submission.id }, { status: 201 });
}
