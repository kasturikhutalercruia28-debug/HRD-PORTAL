"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";

interface Answer {
  id: string;
  answer: string;
  question: { id: string; questionText: string; displayOrder: number };
}
interface Submission {
  id: string;
  submittedAt: string;
  submitter: { name: string; role: string };
  responses: Answer[];
}
interface FormMeta {
  eventName: string;
}

export default function DcmFeedbackResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormMeta | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/feedback/forms/${formId}`).then((r) => r.json()),
      fetch(`/api/feedback/forms/${formId}/responses`).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load");
        return r.json();
      }),
    ])
      .then(([formData, subs]) => {
        setForm(formData);
        setSubmissions(subs);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [formId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-[#180F04]/50 hover:text-[#180F04] mb-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#180F04]/30" /></div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-black/5 px-5 py-10 text-center text-sm text-red-500">{error}</div>
      ) : (
        <>
          <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-1">{form?.eventName}</h1>
          <p className="text-sm text-[#180F04]/50 mb-6">{submissions.length} response{submissions.length !== 1 ? "s" : ""}</p>

          {submissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/5 px-5 py-10 text-center text-sm text-[#180F04]/40">
              No responses submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="bg-white rounded-xl border border-black/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[#180F04]">{sub.submitter.name} · {sub.submitter.role}</p>
                    <p className="text-xs text-[#180F04]/40">
                      {new Date(sub.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {sub.responses
                      .sort((a, b) => a.question.displayOrder - b.question.displayOrder)
                      .map((r) => (
                        <div key={r.id} className="flex gap-2 text-sm">
                          <MessageSquare size={13} className="text-[#180F04]/30 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-[#180F04]/50">{r.question.questionText}</p>
                            <p className="text-[#180F04]">{r.answer}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
