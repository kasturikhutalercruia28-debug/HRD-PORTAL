"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Star } from "lucide-react";

type Question = {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  isRequired: boolean;
  displayOrder: number;
};

type Form = { id: string; eventName: string; questions: Question[] };

export default function ClubFeedbackFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/feedback/forms/${formId}`)
      .then((r) => r.json())
      .then((data) => { setForm(data); setLoading(false); });
  }, [formId]);

  function setValue(qid: string, val: string) {
    setResponses((r) => ({ ...r, [qid]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/feedback/forms/${formId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push("/club/feedback");
    } else {
      const data = await res.json();
      setError(data.error ?? "Submission failed");
    }
  }

  if (loading) return <div className="p-8 text-center text-[#0D0D0B]/40 text-sm">Loading…</div>;
  if (!form) return <div className="p-8 text-center text-red-500 text-sm">Form not found</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B] mb-2">{form.eventName}</h1>
      <p className="text-sm text-[#0D0D0B]/50 mb-6">Event Feedback</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {form.questions.map((q) => (
          <div key={q.id} className="bg-white rounded-xl border border-black/5 p-5">
            <label className="block text-sm font-semibold text-[#0D0D0B] mb-3">
              {q.questionText}
              {q.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {q.questionType === "star_rating" && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setValue(q.id, String(n))}>
                    <Star size={28} className={Number(responses[q.id]) >= n ? "fill-[#AAFF47] text-[#AAFF47]" : "text-[#0D0D0B]/20"} />
                  </button>
                ))}
              </div>
            )}
            {q.questionType === "yes_no" && (
              <div className="flex gap-3">
                {["Yes", "No"].map((opt) => (
                  <button key={opt} type="button" onClick={() => setValue(q.id, opt)}
                    className={`px-5 py-2 rounded-lg text-sm border transition-colors ${responses[q.id] === opt ? "bg-[#AAFF47] border-[#AAFF47] text-[#0D0D0B] font-semibold" : "border-black/15 text-[#0D0D0B] hover:bg-black/5"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.questionType === "multiple_choice" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button key={opt} type="button" onClick={() => setValue(q.id, opt)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${responses[q.id] === opt ? "bg-[#AAFF47] border-[#AAFF47] text-[#0D0D0B] font-semibold" : "border-black/15 text-[#0D0D0B] hover:bg-black/5"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.questionType === "short_text" && (
              <input value={responses[q.id] ?? ""} onChange={(e) => setValue(q.id, e.target.value)} required={q.isRequired}
                className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47]" placeholder="Your answer" />
            )}
            {q.questionType === "long_text" && (
              <textarea value={responses[q.id] ?? ""} onChange={(e) => setValue(q.id, e.target.value)} required={q.isRequired} rows={4}
                className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47] resize-none" placeholder="Your answer" />
            )}
          </div>
        ))}
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 border border-black/15 text-[#0D0D0B] py-2.5 rounded-lg text-sm hover:bg-black/5 transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 bg-[#AAFF47] text-[#0D0D0B] py-2.5 rounded-lg text-sm font-semibold hover:bg-[#99ee36] transition-colors disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
}
