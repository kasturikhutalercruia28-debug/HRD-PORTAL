import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const CLUB_COLORS = ["FFE8A9A5", "FFA9C6F0", "FFF5D6A8", "FFB8E0C4", "FFD8B8E8", "FFF0C9DC"];
const CLUB_COLORS_LIGHT = ["FFF3D4D2", "FFD4E3F7", "FFFAEBD3", "FFDCF0E1", "FFECD9F3", "FFF8E1EC"];

// Every orientation type now lives as a real value in the DB — pres_sec
// included — so this is a simple direct label lookup, no more separate
// call-log tracker to merge in.
const STAGE_LABELS: Record<string, string> = {
  pres_sec: "Pres/Sec",
  core_member: "Core",
  bod: "BOD",
  everyone: "Everyone",
};
const STAGE_ORDER = ["pres_sec", "core_member", "bod", "everyone"];

// Must match the exact question text used in the club booking form
// (NewRequestForm.tsx) so we can pull out who was recorded as conducting it.
const CONDUCTED_BY_Q = "Who should conduct — Chairman HRD or Team HRD";

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "TBD";
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookedRequests = await prisma.orientationRequest.findMany({
    include: {
      club: { select: { name: true } },
      answers: { include: { question: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const allClubNames = new Set(bookedRequests.map((r) => r.club.name));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Orientation Progress");
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 30;

  sheet.mergeCells("B1:D1");
  const title = sheet.getCell("B1");
  title.value = "ORIENTATION PROGRESS TRACKING";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.getCell("B2").value = "Stage";
  sheet.getCell("C2").value = "Date";
  sheet.getCell("D2").value = "Taken By";
  ["B2", "C2", "D2"].forEach((ref) => {
    sheet.getCell(ref).font = { bold: true, size: 10 };
    sheet.getCell(ref).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
  });

  let row = 3;
  let clubIndex = 0;

  for (const clubName of Array.from(allClubNames).sort()) {
    const clubBookings = bookedRequests
      .filter((r) => r.club.name === clubName)
      .sort((a, b) => STAGE_ORDER.indexOf(a.orientationType) - STAGE_ORDER.indexOf(b.orientationType));

    if (clubBookings.length === 0) continue;

    const color = CLUB_COLORS[clubIndex % CLUB_COLORS.length];
    const lightColor = CLUB_COLORS_LIGHT[clubIndex % CLUB_COLORS_LIGHT.length];
    clubIndex++;

    sheet.getCell(`A${row}`).value = clubIndex;
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.mergeCells(`B${row}:D${row}`);
    const clubCell = sheet.getCell(`B${row}`);
    clubCell.value = clubName;
    clubCell.font = { bold: true, size: 13 };
    [`A${row}`, `B${row}`, `C${row}`, `D${row}`].forEach((ref) => {
      sheet.getCell(ref).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    });
    row++;

    for (const booking of clubBookings) {
      const stageLabel = STAGE_LABELS[booking.orientationType] ?? booking.orientationType;
      const takenBy =
        booking.answers.find((a) => a.question.questionText.trim() === CONDUCTED_BY_Q)?.answerText || "—";
      const dateStr = booking.scheduledDate ? fmtDate(booking.scheduledDate) : "TBD";

      sheet.getCell(`B${row}`).value = stageLabel;
      sheet.getCell(`B${row}`).font = { bold: true };
      sheet.getCell(`C${row}`).value = dateStr;
      sheet.getCell(`D${row}`).value = takenBy;
      [`B${row}`, `C${row}`, `D${row}`].forEach((ref) => {
        sheet.getCell(ref).fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightColor } };
      });
      row++;
    }
    row++; // spacer row between clubs
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="orientation-progress-tracking.xlsx"`,
    },
  });
}
