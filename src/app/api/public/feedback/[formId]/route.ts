import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public (no-login) form fetch — only works if HRD has explicitly made this
// form public.
export async function GET(
  _req: Request,
  { params }: { params: { formId: string } }
) {
  const form = await prisma.eventFeedbackForm.findUnique({
    where: { id: params.formId },
    include: { questions: { orderBy: { displayOrder: "asc" } } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!form.isPublic) return NextResponse.json({ error: "This form is not public" }, { status: 403 });
  if (!form.isActive) return NextResponse.json({ error: "This form is not currently open" }, { status: 400 });

  return NextResponse.json({
    id: form.id,
    eventName: form.eventName,
    eventDate: form.eventDate,
    feedbackOpenAt: form.feedbackOpenAt,
    feedbackCloseAt: form.feedbackCloseAt,
    questions: form.questions,
  });
}
