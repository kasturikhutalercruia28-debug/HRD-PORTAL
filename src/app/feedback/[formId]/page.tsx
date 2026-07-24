"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star, CheckCircle2 } from "lucide-react";

type Question = {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  isRequired: boolean;
  displayOrder: number;
};

type Form = {
  id: string;
  eventName: string;
  isPublic: boolean;
  isActive: boolean;
  questions: Question[];
};

const DEVICE_KEY_PREFIX = "hrd_fb_device_";
const SUBMITTED_KEY_PREFIX = "hrd_fb_submitted_";

function getOrCreateDeviceId(formId: string) {
  const key = DEVICE_KEY_PREFIX + formId;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function PublicFeedbackFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Form | null | "not-found" | "unauthorized">(null);
  const [respondentName, setRespondentName] = useState("");
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
    fetch(`/api/feedback/forms/${formId}`)
      .then(async (r) => {
        if (r.status === 401) return "unauthorized" as const;
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
    if (!respondentName.trim()) {
      setError("Please enter your name");
      return;
    }
    setSubmitting(true);
    const deviceId = getOrCreateDeviceId(String(formId));
    const res = await fetch(`/api/feedback/forms/${formId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respondentName: respondentName.trim(), deviceId, responses }),
    });
    setSubmitting(false);
    if (res.ok) {
      localStorage.setItem(SUBMITTED_KEY_PREFIX + String(formId), "1");
      setDone(true);
    } else {
      const data = await res.json();
      if (res.status === 409) {
        setAlreadySubmitted(true);
        localStorage.setItem(SUBMITTED_KEY_PREFIX + String(formId), "1");
      } else {
        setError(data.error ?? "Submission failed");
      }
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
            {done
              ? "Your feedback has been recorded."
              : "You've already submitted feedback for this form from this device."}
          </p>
        </div>
      </div>
    );
  }

  if (form === "not-found") {
    return <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">Form not found</div>;
  }
  if (form === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-[#180F04]/60 text-sm">This feedback form is not publicly available.</p>
      </div>
    );
  }
  if (!form || !form.isActive) {
    return <div className="min-h-screen flex items-center justify-center text-[#180F04]/40 text-sm">This form is not currently accepting responses.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-2">{form.eventName}</h1>
      <p className="text-sm text-[#180F04]/50 mb-6">Event Feedback</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-black/5 p-5">
          <label className="block text-sm font-semibold text-[#180F04] mb-3">
            Your Name<span className="text-red-500 ml-1">*</span>
          </label>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            required
            placeholder="Enter your full name"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white placeholder:text-[#180F04]/30 focus:outline-none focus:border-[#D4A017]"
          />
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
