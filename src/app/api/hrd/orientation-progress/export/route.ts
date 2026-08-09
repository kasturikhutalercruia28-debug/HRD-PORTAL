import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllProgress, STAGE_LABELS } from "@/lib/orientationProgress";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const CLUB_COLORS = ["FFE8A9A5", "FFA9C6F0", "FFF5D6A8", "FFB8E0C4", "FFD8B8E8", "FFF0C9DC"];
const CLUB_COLORS_LIGHT = ["FFF3D4D2", "FFD4E3F7", "FFFAEBD3", "FFDCF0E1", "FFECD9F3", "FFF8E1EC"];

const REQUEST_TYPE_TO_STAGE: Record<string, string> = {
  core_member: "core",
  bod: "bod",
  everyone: "everyone",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested (pending)",
  rejected: "Rejected",
  scheduled: "Scheduled",
  conducted: "Conducted",
  feedback_submitted: "Feedback Submitted",
  certificate_generated: "Certificate Generated",
};

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "TBD";
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progressEntries = await getAllProgress();
  const bookedRequests = await prisma.orientationRequest.findMany({
    include: { club: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const stageOrder = ["pres_sec", "core", "bod", "everyone"];

  // Union of every club name appearing in either source.
  const allClubNames = new Set<string>([
    ...progressEntries.map((e) => e.clubName),
    ...bookedRequests.map((r) => r.club.name),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Orientation Progress");
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 90;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 20;

  sheet.mergeCells("B1:D1");
  const title = sheet.getCell("B1");
  title.value = "ORIENTATION PROGRESS TRACKING";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  let row = 2;
  let clubIndex = 0;

  for (const clubName of Array.from(allClubNames).sort()) {
    const clubProgress = progressEntries
      .filter((e) => e.clubName === clubName)
      .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));
    const clubBookings = bookedRequests.filter((r) => r.club.name === clubName);

    // Skip clubs with nothing at all recorded.
    if (clubProgress.length === 0 && clubBookings.length === 0) continue;

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

    for (const stage of stageOrder) {
      const entry = clubProgress.find((e) => e.stage === stage);
      const stageLabel = STAGE_LABELS[stage as keyof typeof STAGE_LABELS];
      const booking = clubBookings.find((r) => REQUEST_TYPE_TO_STAGE[r.orientationType] === stage);

      if (!entry && !booking) continue; // nothing recorded for this stage — skip it entirely

      // Call-log meetings (Pres/Sec etc., tracked manually by HRD)
      if (entry) {
        const meetings = entry.meetings.length > 0 ? entry.meetings : [];
        meetings.forEach((m, mi) => {
          sheet.mergeCells(`B${row}:D${row}`);
          const dateCell = sheet.getCell(`B${row}`);
          if (m.isRevertAwaited) {
            dateCell.value = {
              richText: [
                { font: { bold: true }, text: `${stageLabel} — Meeting ${mi + 1} Date: ` },
                { text: "Revert Awaited" },
              ],
            } as ExcelJS.CellRichTextValue;
          } else {
            const dateStr = m.date ? fmtDate(new Date(m.date)) : "TBD";
            dateCell.value = {
              richText: [
                { font: { bold: true }, text: `${stageLabel} — Meeting ${mi + 1} Date: ` },
                { text: `${dateStr}${m.mode ? ` [${m.mode === "online" ? "Online" : "Offline"}]` : ""}` },
              ],
            } as ExcelJS.CellRichTextValue;
          }
          dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightColor } };
          row++;

          if (!m.isRevertAwaited) {
            if (m.meetingWith || m.takenBy) {
              sheet.mergeCells(`B${row}:D${row}`);
              sheet.getCell(`B${row}`).value = {
                richText: [
                  { font: { bold: true }, text: "Meeting with: " },
                  { text: `${m.meetingWith || "—"} || ` },
                  { font: { bold: true }, text: "Meeting taken by: " },
                  { text: m.takenBy || "—" },
                ],
              } as ExcelJS.CellRichTextValue;
              row++;
            }
            if (m.discussion) {
              sheet.mergeCells(`B${row}:D${row}`);
              sheet.getCell(`B${row}`).value = {
                richText: [{ font: { bold: true }, text: "Discussion: " }, { text: m.discussion }],
              } as ExcelJS.CellRichTextValue;
              row++;
            }
          }
        });

        if (meetings.length === 0) {
          sheet.mergeCells(`B${row}:D${row}`);
          const c = sheet.getCell(`B${row}`);
          c.value = { richText: [{ font: { bold: true }, text: `${stageLabel}: ` }, { text: "No meetings logged yet" }] } as ExcelJS.CellRichTextValue;
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightColor } };
          row++;
        }
      }

      // Formal booking made through SYNC (Core / BOD / Everyone)
      if (booking) {
        sheet.mergeCells(`B${row}:D${row}`);
        const c = sheet.getCell(`B${row}`);
        const statusLabel = STATUS_LABELS[booking.status] ?? booking.status;
        const scheduled = booking.scheduledDate ? fmtDate(booking.scheduledDate) : null;
        c.value = {
          richText: [
            { font: { bold: true }, text: `${stageLabel} — Booked via SYNC: ` },
            {
              text: scheduled
                ? `${scheduled}${booking.scheduledTime ? ` (${booking.scheduledTime})` : ""} · ${statusLabel}`
                : `${statusLabel} — awaiting scheduling`,
            },
          ],
        } as ExcelJS.CellRichTextValue;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightColor } };
        row++;
      }
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
