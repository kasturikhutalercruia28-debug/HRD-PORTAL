import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllProgress, STAGE_LABELS } from "@/lib/orientationProgress";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const CLUB_COLORS = ["FFE8A9A5", "FFA9C6F0", "FFF5D6A8", "FFB8E0C4", "FFD8B8E8", "FFF0C9DC"];
const CLUB_COLORS_LIGHT = ["FFF3D4D2", "FFD4E3F7", "FFFAEBD3", "FFDCF0E1", "FFECD9F3", "FFF8E1EC"];

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getAllProgress();

  // Group by club name, keep stage order pres_sec -> core -> bod -> everyone
  const stageOrder = ["pres_sec", "core", "bod", "everyone"];
  const byClub = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byClub.has(e.clubName)) byClub.set(e.clubName, []);
    byClub.get(e.clubName)!.push(e);
  }
  for (const list of byClub.values()) {
    list.sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Orientation Progress");
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 90;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 20;

  // Title row
  sheet.mergeCells("B1:D1");
  const title = sheet.getCell("B1");
  title.value = "ORIENTATION PROGRESS TRACKING";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  let row = 2;
  let clubIndex = 0;

  for (const [clubName, clubEntries] of byClub.entries()) {
    const color = CLUB_COLORS[clubIndex % CLUB_COLORS.length];
    const lightColor = CLUB_COLORS_LIGHT[clubIndex % CLUB_COLORS_LIGHT.length];
    clubIndex++;

    // Club header row
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

    for (const entry of clubEntries) {
      const stageLabel = STAGE_LABELS[entry.stage];
      const meetings = entry.meetings.length > 0 ? entry.meetings : [];

      meetings.forEach((m, mi) => {
        // Meeting N Date row
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
          const dateStr = m.date
            ? new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })
            : "TBD";
          dateCell.value = {
            richText: [
              { font: { bold: true }, text: `${stageLabel} — Meeting ${mi + 1} Date: ` },
              { text: `${dateStr}${m.mode ? ` [${m.mode === "online" ? "Online" : "Offline"}]` : ""}` },
            ],
          } as ExcelJS.CellRichTextValue;
        }
        dateCell.font = { ...(dateCell.font ?? {}) };
        dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightColor } };
        row++;

        if (!m.isRevertAwaited) {
          if (m.meetingWith || m.takenBy) {
            sheet.mergeCells(`B${row}:D${row}`);
            const c = sheet.getCell(`B${row}`);
            c.value = {
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
            const c = sheet.getCell(`B${row}`);
            c.value = {
              richText: [
                { font: { bold: true }, text: "Discussion: " },
                { text: m.discussion },
              ],
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
