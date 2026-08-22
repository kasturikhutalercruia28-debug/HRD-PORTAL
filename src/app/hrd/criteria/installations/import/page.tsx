"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface Dcm {
  id: string;
  name: string;
  title: string;
}
interface ClubOpt {
  id: string;
  name: string;
}

interface ParsedPerson {
  rowIndex: number;
  excelName: string;
  normalized: string;
  attendedHeaders: string[]; // club column headers where cell === true
  matchedDcmId: string | null;
  matchConfidence: "exact" | "fuzzy" | "none";
  skip: boolean;
}

interface ParsedClub {
  header: string;
  matchedClubName: string; // resolved Club.name if found, else the raw header
}

// Strips leading titles/honorifics repeatedly (handles "DRR Rtr. Name" etc.)
function normalizeName(raw: string): string {
  let s = raw.trim();
  const titleRe = /^(DRR|IPDRR|DRS|IPP|Rtr\.?|Mr\.?|Ms\.?|Dr\.?)\s+/i;
  while (titleRe.test(s)) s = s.replace(titleRe, "");
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeClub(raw: string): string {
  return raw
    .replace(/^Rotaract Club of\s+/i, "")
    .replace(/^RC\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fuzzyMatchDcm(normName: string, dcms: Dcm[]): { id: string | null; confidence: "exact" | "fuzzy" | "none" } {
  const exact = dcms.find((d) => normalizeName(d.name) === normName);
  if (exact) return { id: exact.id, confidence: "exact" };

  const nameTokens = normName.split(" ").filter(Boolean);
  let best: { id: string; score: number } | null = null;
  for (const d of dcms) {
    const dTokens = normalizeName(d.name).split(" ").filter(Boolean);
    const overlap = nameTokens.filter((t) => dTokens.includes(t)).length;
    const score = overlap / Math.max(nameTokens.length, dTokens.length);
    if (score >= 0.6 && (!best || score > best.score)) best = { id: d.id, score };
  }
  return best ? { id: best.id, confidence: "fuzzy" } : { id: null, confidence: "none" };
}

export default function InstallationsImportPage() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [clubs, setClubs] = useState<ParsedClub[]>([]);
  const [people, setPeople] = useState<ParsedPerson[]>([]);
  const [dcms, setDcms] = useState<Dcm[]>([]);
  const [skippedDecCount, setSkippedDecCount] = useState(0);
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setError("");
    setResult(null);
    try {
      const [dcmRes, clubRes] = await Promise.all([
        fetch("/api/hrd/dcms"),
        fetch("/api/hrd/orientations/clubs"),
      ]);
      if (!dcmRes.ok) throw new Error("Couldn't load DCM list — check /api/hrd/dcms exists.");
      if (!clubRes.ok) throw new Error("Couldn't load Club list.");
      const dcms: Dcm[] = (await dcmRes.json()).dcms ?? [];
      const clubOpts: ClubOpt[] = await clubRes.json();

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];

      if (rows.length < 2) throw new Error("Sheet looks empty.");
      const header = rows[0] as (string | undefined)[];

      // Columns from index 2 onward (A=Count, B=Name) are club columns.
      const clubColIndexes: number[] = [];
      for (let c = 2; c < header.length; c++) {
        if (header[c] && String(header[c]).trim()) clubColIndexes.push(c);
      }

      const parsedClubs: ParsedClub[] = clubColIndexes.map((c) => {
        const h = String(header[c]).trim();
        const match = clubOpts.find((co) => normalizeClub(co.name) === normalizeClub(h));
        return { header: h, matchedClubName: match ? match.name : h };
      });

      let inDcmSection = false;
      let decSkipped = 0;
      const parsedPeople: ParsedPerson[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r] ?? [];
        const nameCell = row[1];
        const name = nameCell ? String(nameCell).trim() : "";
        if (!name) continue;

        if (/council members/i.test(name)) {
          inDcmSection = true; // marker row itself — skip, DCM rows start after this
          continue;
        }
        if (/^total\b|grand total/i.test(name)) {
          break; // footer summary rows — stop reading
        }
        if (!inDcmSection) {
          decSkipped++;
          continue; // DEC section — ignored per instructions
        }

        const attendedHeaders = clubColIndexes
          .map((c, i) => (row[c] === true ? parsedClubs[i].header : null))
          .filter((x): x is string => x !== null);

        const normalized = normalizeName(name);
        const { id, confidence } = fuzzyMatchDcm(normalized, dcms);

        parsedPeople.push({
          rowIndex: r,
          excelName: name,
          normalized,
          attendedHeaders,
          matchedDcmId: id,
          matchConfidence: confidence,
          skip: false,
        });
      }

      setClubs(parsedClubs);
      setPeople(parsedPeople);
      setDcms(dcms);
      setSkippedDecCount(decSkipped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    } finally {
      setParsing(false);
    }
  }

  function updateMatch(rowIndex: number, dcmId: string) {
    setPeople((prev) =>
      prev.map((p) => (p.rowIndex === rowIndex ? { ...p, matchedDcmId: dcmId || null, matchConfidence: "exact" } : p))
    );
  }

  function toggleSkip(rowIndex: number) {
    setPeople((prev) => prev.map((p) => (p.rowIndex === rowIndex ? { ...p, skip: !p.skip } : p)));
  }

  const unresolvedCount = people.filter((p) => !p.skip && !p.matchedDcmId).length;
  const readyCount = people.filter((p) => !p.skip && p.matchedDcmId).length;

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      // Invert person→clubs into club→attendeeDcmIds, since Installation
      // records are per-club.
      const byClub = new Map<string, string[]>();
      for (const p of people) {
        if (p.skip || !p.matchedDcmId) continue;
        for (const header of p.attendedHeaders) {
          const club = clubs.find((c) => c.header === header);
          const clubName = club?.matchedClubName ?? header;
          if (!byClub.has(clubName)) byClub.set(clubName, []);
          byClub.get(clubName)!.push(p.matchedDcmId);
        }
      }
      const entries = Array.from(byClub.entries())
        .filter(([, ids]) => ids.length > 0)
        .map(([clubName, attendeeDcmIds]) => ({ clubName, date: globalDate, attendeeDcmIds }));

      if (entries.length === 0) throw new Error("Nothing to import — no clubs have any resolved attendees.");

      const res = await fetch("/api/hrd/criteria/installations/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      setResult({ created: data.created });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">Import Installation Attendance</h1>
        <p className="text-[#180F04]/60 text-sm mt-1">
          Upload the club × DCM attendance matrix (.xlsx). District Executive Committee rows are ignored automatically.
        </p>
      </div>

      {people.length === 0 && (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-black/15 rounded-xl py-14 cursor-pointer hover:border-[#D4A017] transition-colors bg-white">
          {parsing ? (
            <Loader2 size={22} className="animate-spin text-[#180F04]/40" />
          ) : (
            <Upload size={22} className="text-[#180F04]/40" />
          )}
          <span className="text-sm text-[#180F04]/60">
            {parsing ? "Parsing…" : "Click to choose an .xlsx file"}
          </span>
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          Imported {result.created} installation record{result.created === 1 ? "" : "s"}.
        </div>
      )}

      {people.length > 0 && !result && (
        <>
          <div className="bg-white rounded-xl border border-black/5 p-4 text-sm text-[#180F04]/70 space-y-1">
            <p>
              Found <strong>{clubs.length}</strong> clubs and <strong>{people.length}</strong> DCM rows
              (ignored {skippedDecCount} DEC rows).
            </p>
            <p className={unresolvedCount > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
              {readyCount} matched and ready · {unresolvedCount} need manual matching below.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-black/5 p-4 flex items-center gap-3">
            <label className="text-sm font-medium text-[#180F04]">Installation date for this batch:</label>
            <input
              type="date"
              value={globalDate}
              onChange={(e) => setGlobalDate(e.target.value)}
              className="border border-black/15 rounded-lg px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-[#180F04]/40">The sheet has no per-club dates, so one date applies to this whole import.</span>
          </div>

          <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
            <div className="divide-y divide-black/5 max-h-[28rem] overflow-y-auto">
              {people
                .slice()
                .sort((a, b) => (a.matchedDcmId ? 1 : 0) - (b.matchedDcmId ? 1 : 0))
                .map((p) => (
                  <div
                    key={p.rowIndex}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                      p.skip ? "opacity-40" : !p.matchedDcmId ? "bg-amber-50" : ""
                    }`}
                  >
                    <span className="w-44 shrink-0 truncate text-[#180F04]">{p.excelName}</span>
                    <span className="w-16 shrink-0 text-[#180F04]/40 text-xs">
                      {p.attendedHeaders.length} clubs
                    </span>
                    <select
                      value={p.matchedDcmId ?? ""}
                      onChange={(e) => updateMatch(p.rowIndex, e.target.value)}
                      disabled={p.skip}
                      className={`flex-1 border rounded-lg px-2 py-1 text-xs bg-white ${
                        !p.matchedDcmId ? "border-amber-400" : "border-black/15"
                      }`}
                    >
                      <option value="">— Select DCM —</option>
                      {dcms
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.title ? `(${d.title})` : ""}
                          </option>
                        ))}
                    </select>
                    {p.matchConfidence === "fuzzy" && !p.skip && (
                      <span className="text-[10px] text-amber-600 shrink-0">fuzzy match — verify</span>
                    )}
                    <button
                      onClick={() => toggleSkip(p.rowIndex)}
                      className="text-[10px] text-[#180F04]/40 hover:text-[#180F04] shrink-0 underline"
                    >
                      {p.skip ? "Include" : "Skip"}
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting || unresolvedCount > 0}
            className="w-full bg-[#D4A017] text-[#180F04] py-3 rounded-xl text-sm font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {unresolvedCount > 0
              ? `Resolve ${unresolvedCount} unmatched name(s) first`
              : `Import ${readyCount} DCMs across ${clubs.length} clubs`}
          </button>
        </>
      )}
    </div>
  );
}
