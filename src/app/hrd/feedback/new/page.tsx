"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HrdFeedbackNewPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [allowResubmit, setAllowResubmit] = useState(false);
  const [feedbackOpenAt, setFeedbackOpenAt] = useState("");
  const [feedbackCloseAt, setFeedbackCloseAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/feedback/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventDate,
        useTemplate,
        isActive,
        allowResubmit,
        feedbackOpenAt: feedbackOpenAt || undefined,
        feedbackCloseAt: feedbackCloseAt || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/hrd/feedback/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create form");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B] mb-6">New Feedback Form</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0B] mb-1.5">Event Name</label>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
            placeholder="e.g. District Orientation 2025"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0B] mb-1.5">Event Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white focus:outline-none focus:border-[#AAFF47]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#0D0D0B] mb-1.5">Feedback Opens</label>
            <input
              type="datetime-local"
              value={feedbackOpenAt}
              onChange={(e) => setFeedbackOpenAt(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white focus:outline-none focus:border-[#AAFF47]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0D0D0B] mb-1.5">Feedback Closes</label>
            <input
              type="datetime-local"
              value={feedbackCloseAt}
              onChange={(e) => setFeedbackCloseAt(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white focus:outline-none focus:border-[#AAFF47]"
            />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="w-4 h-4 rounded accent-[#AAFF47]"
            />
            <span className="text-sm text-[#0D0D0B]">Pre-fill with default template (11 questions)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded accent-[#AAFF47]"
            />
            <span className="text-sm text-[#0D0D0B]">Active (visible to clubs & DCMs)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowResubmit}
              onChange={(e) => setAllowResubmit(e.target.checked)}
              className="w-4 h-4 rounded accent-[#AAFF47]"
            />
            <span className="text-sm text-[#0D0D0B]">Allow resubmission</span>
          </label>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 border border-black/15 text-[#0D0D0B] py-2 rounded-lg text-sm hover:bg-black/5 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-[#AAFF47] text-[#0D0D0B] py-2 rounded-lg text-sm font-semibold hover:bg-[#99ee36] transition-colors disabled:opacity-50">
            {loading ? "Creating…" : "Create Form"}
          </button>
        </div>
      </form>
    </div>
  );
}
