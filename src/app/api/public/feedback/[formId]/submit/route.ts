import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public (no-login) submission — captures basic respondent details since
// there's no logged-in account to attribute the response to.
export async function POST(
  req: NextRequest,
  { params }: { params: { formId: string } }
) {
  const form = await prisma.eventFeedbackForm.findUnique({
    where: { id: params.formId },
    include: { questions: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  if (!form.isPublic) return NextResponse.json({ error: "This form is not public" }, { status: 403 });
  if (!form.isActive) return NextResponse.json({ error: "Form is not active" }, { status: 400 });

  const now = new Date();
  if (form.feedbackOpenAt && now < form.feedbackOpenAt) {
    return NextResponse.json({ error: "Feedback is not open yet" }, { status: 400 });
  }
  if (form.feedbackCloseAt && now > form.feedbackCloseAt) {
    return NextResponse.json({ error: "Feedback period has closed" }, { status: 400 });
  }

  const body = await req.json();
  const { respondentName, respondentContact, respondentClub, respondentPosition, responses } = body;

  if (!respondentName?.toString().trim() || !respondentContact?.toString().trim() ||
      !respondentClub?.toString().trim() || !respondentPosition?.toString().trim()) {
    return NextResponse.json({ error: "Name, contact number, club, and position are all required" }, { status: 400 });
  }

  const required = form.questions.filter((q) => q.isRequired);
  const missing = required.filter((q) => !responses?.[q.id]?.toString().trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Missing required answers", missing: missing.map((q) => q.id) },
      { status: 400 }
    );
  }

  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.eventFeedbackSubmission.create({
      data: {
        formId: params.formId,
        respondentName: respondentName.toString().trim(),
        respondentContact: respondentContact.toString().trim(),
        respondentClub: respondentClub.toString().trim(),
        respondentPosition: respondentPosition.toString().trim(),
      },
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
