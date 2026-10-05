"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star, CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  isRequired: boolean;
  displayOrder: number;
}

interface Form {
  id: string;
  eventName: string;
  feedbackOpenAt: string | null;
  feedbackCloseAt: string | null;
  questions: Question[];
}

const SUBMITTED_KEY_PREFIX = "hrd_public_fb_submitted_";

export default function PublicFeedbackFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Form | null | "not-found" | "not-public">(null);
  const [respondentName, setRespondentName] = useState("");
  const [respondentContact, setRespondentContact] = useState("");
  const [respondentClub, setRespondentClub] = useState("");
  const [respondentPosition, setRespondentPosition] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SUBMITTED_KEY_PREFIX + formId)) {
      setAlreadySubmitted(true);
      setLoading(false);
      return;
    }
    fetch(`/api/public/feedback/${formId}`)
      .then(async (r) => {
        if (r.status === 403) return "not-public" as const;
        if (r.status === 404) return "not-found" as const;
        return r.json();
      })
      .then((data) => {
        setForm(data);
        setLoading(false);
      });
  }, [formId]);

  function setValue(qid: string, val: string) {
    setResponses((r) => ({ ...r, [qid]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!respondentName.trim() || !respondentContact.trim() || !respondentClub.trim() || !respondentPosition.trim()) {
      setError("Please fill in your name, contact number, club, and position.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/public/feedback/${formId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        respondentName: respondentName.trim(),
        respondentContact: respondentContact.trim(),
        respondentClub: respondentClub.trim(),
        respondentPosition: respondentPosition.trim(),
        responses,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      localStorage.setItem(SUBMITTED_KEY_PREFIX + String(formId), "1");
      setDone(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Submission failed");
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#180F04]/40 text-sm">Loading…</div>;
  }

  if (alreadySubmitted || done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
          <h1 className="font-['Fraunces'] text-xl font-bold text-[#180F04] mb-1">
            {done ? "Thank you!" : "Already submitted"}
          </h1>
          <p className="text-sm text-[#180F04]/60">
            {done ? "Your feedback has been recorded." : "You've already submitted feedback from this device."}
          </p>
        </div>
      </div>
    );
  }

  if (form === "not-found") {
    return <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">Form not found</div>;
  }
  if (form === "not-public") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-[#180F04]/60 text-sm">This feedback form is not publicly available.</p>
      </div>
    );
  }
  if (!form) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-2">{form.eventName}</h1>
      <p className="text-sm text-[#180F04]/50 mb-6">Event Feedback</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-black/5 p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#180F04] mb-1.5">
              Your Name<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              required
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#180F04] mb-1.5">
              Contact Number<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              value={respondentContact}
              onChange={(e) => setRespondentContact(e.target.value)}
              required
              type="tel"
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#180F04] mb-1.5">
              Club Name<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              value={respondentClub}
              onChange={(e) => setRespondentClub(e.target.value)}
              required
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#180F04] mb-1.5">
              Position (e.g. DCM, DEC, Club President, Member)<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              value={respondentPosition}
              onChange={(e) => setRespondentPosition(e.target.value)}
              required
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
        </div>

        {form.questions.map((q) => (
          <div key={q.id} className="bg-white rounded-xl border border-black/5 p-5">
            <label className="block text-sm font-semibold text-[#180F04] mb-3">
              {q.questionText}
              {q.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {q.questionType === "star_rating" && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setValue(q.id, String(n))}>
                    <Star size={28} className={Number(responses[q.id]) >= n ? "fill-[#D4A017] text-[#D4A017]" : "text-[#180F04]/20"} />
                  </button>
                ))}
              </div>
            )}
            {q.questionType === "yes_no" && (
              <div className="flex gap-3">
                {["Yes", "No"].map((opt) => (
                  <button key={opt} type="button" onClick={() => setValue(q.id, opt)}
                    className={`px-5 py-2 rounded-lg text-sm border transition-colors ${responses[q.id] === opt ? "bg-[#D4A017] border-[#D4A017] text-[#180F04] font-semibold" : "border-black/15 text-[#180F04] hover:bg-black/5"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.questionType === "multiple_choice" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button key={opt} type="button" onClick={() => setValue(q.id, opt)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${responses[q.id] === opt ? "bg-[#D4A017] border-[#D4A017] text-[#180F04] font-semibold" : "border-black/15 text-[#180F04] hover:bg-black/5"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.questionType === "short_text" && (
              <input value={responses[q.id] ?? ""} onChange={(e) => setValue(q.id, e.target.value)} required={q.isRequired}
                className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white placeholder:text-[#180F04]/30 focus:outline-none focus:border-[#D4A017]" placeholder="Your answer" />
            )}
            {q.questionType === "long_text" && (
              <textarea value={responses[q.id] ?? ""} onChange={(e) => setValue(q.id, e.target.value)} required={q.isRequired} rows={4}
                className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white placeholder:text-[#180F04]/30 focus:outline-none focus:border-[#D4A017] resize-none" placeholder="Your answer" />
            )}
          </div>
        ))}
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full bg-[#D4A017] text-[#180F04] py-2.5 rounded-lg text-sm font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50">
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
