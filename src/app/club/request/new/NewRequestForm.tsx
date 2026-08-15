"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, CalendarDays, Users, MessageSquare, CheckCircle2 } from "lucide-react";

type OrientationType = "core_member" | "bod" | "everyone";
type TimePeriod = "morning" | "afternoon" | "evening";

const TYPE_OPTIONS: { value: OrientationType; label: string; desc: string }[] = [
  { value: "core_member", label: "Core Member", desc: "Orientation for core team members" },
  { value: "bod", label: "Board of Directors", desc: "Orientation for BOD" },
  { value: "everyone", label: "Everyone", desc: "Full club-wide orientation" },
];

const TIME_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "morning", label: "Morning (9am – 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm – 4pm)" },
  { value: "evening", label: "Evening (4pm – 8pm)" },
];

// Special questions get custom UI instead of a generic textarea. These must
// match the questionText EXACTLY as entered by HRD in the Orientation
// Questions admin page — if the text doesn't match exactly, the question
// just falls back to a plain textarea (safe default, nothing breaks).
const MODE_Q = "Mode (Online/Offline)";
const VENUE_Q = "Venue (if Offline)";
const TIMING_NOTES_Q = "Any changes in preferred timing";
const CONDUCTED_BY_Q = "Who should conduct — Chairman HRD or Team HRD";

interface Props {
  questionsByType: Record<string, { id: string; questionText: string }[]>;
}

interface DateSlot {
  date: string;
  time: TimePeriod;
}

const STEPS = [
  { n: 1, label: "Type", icon: Users },
  { n: 2, label: "Questions", icon: MessageSquare },
  { n: 3, label: "Dates", icon: CalendarDays },
];

export default function NewRequestForm({ questionsByType }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orientationType, setOrientationType] = useState<OrientationType | "">("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expectedAttendance, setExpectedAttendance] = useState("");
  const [slots, setSlots] = useState<DateSlot[]>([
    { date: "", time: "morning" },
    { date: "", time: "afternoon" },
    { date: "", time: "evening" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gating, setGating] = useState<{ presSecCompleted: boolean; coreCompleted: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/club/orientation-status")
      .then((r) => (r.ok ? r.json() : { presSecCompleted: true, coreCompleted: true }))
      .then(setGating)
      .catch(() => setGating({ presSecCompleted: true, coreCompleted: true }));
  }, []);

  const questions = orientationType ? (questionsByType[orientationType] ?? []) : [];
  const today = new Date().toISOString().split("T")[0];

  const modeQuestion = questions.find((q) => q.questionText.trim() === MODE_Q);
  const modeAnswer = modeQuestion ? answers[modeQuestion.id] : undefined;

  const visibleQuestions = questions.filter((q) => {
    if (q.questionText.trim() === VENUE_Q) {
      return modeAnswer === "Offline";
    }
    return true;
  });

  function setAnswer(id: string, val: string) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function handleSlot(idx: number, field: keyof DateSlot, val: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }

  async function handleSubmit() {
    if (slots.some((s) => !s.date)) {
      setError("Please fill all three preferred dates.");
      return;
    }
    if (!expectedAttendance || Number(expectedAttendance) < 1) {
      setError("Enter expected attendance.");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/club/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orientationType,
        expectedAttendance: Number(expectedAttendance),
        preferredDate1: slots[0].date,
        preferredTime1: slots[0].time,
        preferredDate2: slots[1].date,
        preferredTime2: slots[1].time,
        preferredDate3: slots[2].date,
        preferredTime3: slots[2].time,
        answers,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/club/request/${id}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Submission failed. Try again.");
    }
  }

  const inputCls =
    "w-full border border-black/10 rounded-xl px-4 py-3 text-sm font-['Geist'] text-[#180F04] focus:outline-none focus:ring-2 focus:ring-[#D4A017] bg-white placeholder:text-[#180F04]/30";

  function renderChoice(qId: string, options: string[]) {
    return (
      <div className="flex gap-3 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setAnswer(qId, opt)}
            className={`px-5 py-2.5 rounded-xl text-sm font-['Geist'] font-medium border transition-colors ${
              answers[qId] === opt
                ? "bg-[#180F04] border-[#180F04] text-[#D4A017]"
                : "border-black/10 bg-white text-[#180F04] hover:border-black/20"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => (step === 1 ? router.push("/club/dashboard") : setStep(step - 1))}
          className="text-[#180F04]/40 hover:text-[#180F04] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-['Fraunces'] text-xl font-bold text-[#180F04]">
            New Orientation Request
          </h1>
          <p className="text-[#180F04]/40 text-xs font-['Geist'] mt-0.5">
            Step {step} of 3
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map(({ n, label, icon: Icon }) => (
          <div
            key={n}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-['Geist'] font-medium transition-colors ${
              step === n
                ? "bg-[#180F04] text-[#D4A017]"
                : step > n
                ? "bg-[#D4A017]/20 text-[#180F04]"
                : "bg-black/5 text-[#180F04]/40"
            }`}
          >
            {step > n ? <CheckCircle2 size={11} /> : <Icon size={11} />}
            {label}
          </div>
        ))}
      </div>

      {/* Step 1: Orientation type */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-[#180F04] font-semibold font-['Geist'] text-sm mb-4">
            What type of orientation are you requesting?
          </p>
          {TYPE_OPTIONS.map((opt) => {
            const locked =
              (opt.value === "core_member" && gating && !gating.presSecCompleted) ||
              (opt.value === "bod" && gating && !gating.coreCompleted);
            const lockMessage =
              opt.value === "core_member"
                ? "Complete your Pres/Sec orientation call with HRD first."
                : "Complete your Core orientation first.";
            return (
              <div key={opt.value}>
                <button
                  onClick={() => !locked && setOrientationType(opt.value)}
                  disabled={!!locked}
                  className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    locked
                      ? "border-black/5 bg-black/[0.02] opacity-60 cursor-not-allowed"
                      : orientationType === opt.value
                      ? "border-[#D4A017] bg-[#D4A017]/5 shadow-sm"
                      : "border-black/10 bg-white hover:border-black/20"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      orientationType === opt.value ? "border-[#180F04] bg-[#180F04]" : "border-black/20"
                    }`}
                  >
                    {orientationType === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-[#D4A017]" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#180F04] font-['Geist']">{opt.label}</p>
                    <p className="text-[#180F04]/50 text-xs font-['Geist'] mt-0.5">{opt.desc}</p>
                    {locked && (
                      <p className="text-amber-600 text-xs font-['Geist'] mt-1.5 flex items-center gap-1">
                        🔒 {lockMessage}
                      </p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}

          <button
            disabled={!orientationType}
            onClick={() => setStep(2)}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-[#180F04] text-[#D4A017] rounded-xl text-sm font-semibold font-['Geist'] hover:bg-[#180F04]/80 transition-colors disabled:opacity-40"
          >
            Continue
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Step 2: Questions (always shown — may be empty) */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-[#180F04] font-semibold font-['Geist'] text-sm">
            Pre-orientation questions
          </p>

          {visibleQuestions.length === 0 ? (
            <div className="bg-[#FBF7EE] rounded-xl px-5 py-6 text-center">
              <p className="text-[#180F04]/50 text-sm font-['Geist']">
                No questions configured for this orientation type yet.
              </p>
              <p className="text-[#180F04]/30 text-xs font-['Geist'] mt-1">
                You can proceed to the next step.
              </p>
            </div>
          ) : (
            visibleQuestions.map((q, i) => {
              const text = q.questionText.trim();

              if (text === MODE_Q) {
                return (
                  <div key={q.id}>
                    <label className="block text-sm text-[#180F04] font-['Geist'] font-medium mb-2 whitespace-pre-line">
                      {i + 1}. {q.questionText}
                    </label>
                    {renderChoice(q.id, ["Online", "Offline"])}
                  </div>
                );
              }

              if (text === CONDUCTED_BY_Q) {
                return (
                  <div key={q.id}>
                    <label className="block text-sm text-[#180F04] font-['Geist'] font-medium mb-2 whitespace-pre-line">
                      {i + 1}. {q.questionText}
                    </label>
                    {renderChoice(q.id, ["Chairman HRD", "Team HRD"])}
                  </div>
                );
              }

              if (text === TIMING_NOTES_Q) {
                return (
                  <div key={q.id}>
                    <label className="block text-sm text-[#180F04] font-['Geist'] font-medium mb-2 whitespace-pre-line">
                      {i + 1}. {q.questionText}
                    </label>
                    <input
                      type="text"
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Prefer after 5pm, or no change"
                    />
                  </div>
                );
              }

              // Default (includes the Venue question, which is fine as a
              // long-text box) and any other custom question HRD has added.
              return (
                <div key={q.id}>
                  <label className="block text-sm text-[#180F04] font-['Geist'] font-medium mb-2 whitespace-pre-line">
                    {i + 1}. {q.questionText}
                  </label>
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    rows={3}
                    className={inputCls + " resize-none"}
                    placeholder="Your answer..."
                  />
                </div>
              );
            })
          )}

          <button
            onClick={() => setStep(3)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#180F04] text-[#D4A017] rounded-xl text-sm font-semibold font-['Geist'] hover:bg-[#180F04]/80 transition-colors"
          >
            Continue
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Step 3: Dates + attendance */}
      {step === 3 && (
        <div className="space-y-6">
          <p className="text-[#180F04] font-semibold font-['Geist'] text-sm">
            Choose 3 preferred dates and time periods
          </p>

          {slots.map((slot, i) => (
            <div key={i} className="bg-white border border-black/10 rounded-xl p-4 space-y-3">
              <p className="text-xs text-[#180F04]/50 font-['Geist'] font-medium uppercase tracking-wide">
                {["1st", "2nd", "3rd"][i]} Preference
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-[#180F04]/50 mb-1 font-['Geist']">Date</label>
                  <input
                    type="date"
                    min={today}
                    value={slot.date}
                    onChange={(e) => handleSlot(i, "date", e.target.value)}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm font-['Geist'] text-[#180F04] focus:outline-none focus:ring-2 focus:ring-[#D4A017] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#180F04]/50 mb-1 font-['Geist']">Time Period</label>
                  <select
                    value={slot.time}
                    onChange={(e) => handleSlot(i, "time", e.target.value as TimePeriod)}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm font-['Geist'] text-[#180F04] focus:outline-none focus:ring-2 focus:ring-[#D4A017] bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm text-[#180F04] font-['Geist'] font-medium mb-2 whitespace-pre-line">
              Expected Attendance
            </label>
            <input
              type="number"
              min={1}
              value={expectedAttendance}
              onChange={(e) => setExpectedAttendance(e.target.value)}
              className={inputCls}
              placeholder="How many members will attend?"
            />
          </div>

          {error && <p className="text-red-600 text-sm font-['Geist']">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#180F04] text-[#D4A017] rounded-xl text-sm font-semibold font-['Geist'] hover:bg-[#180F04]/80 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Submit Request
          </button>
        </div>
      )}
    </div>
  );
}
