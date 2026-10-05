"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Avenue {
  id: string;
  name: string;
}

export default function HrdFeedbackNewPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [allowResubmit, setAllowResubmit] = useState(false);
  const [feedbackOpenAt, setFeedbackOpenAt] = useState("");
  const [feedbackCloseAt, setFeedbackCloseAt] = useState("");
  const [avenues, setAvenues] = useState<Avenue[]>([]);
  const [avenueId, setAvenueId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/hrd/avenues")
      .then((r) => r.json())
      .then((d) => setAvenues(d.avenues ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!eventName.trim() || !eventDate) {
      setError("Event name and date are required.");
      return;
    }
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
        avenueId: avenueId || undefined,
        isPublic,
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
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-6">New Feedback Form</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Event Name</label>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            placeholder="e.g. District Installation Ceremony"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Event Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Opens At (optional)</label>
            <input
              type="datetime-local"
              value={feedbackOpenAt}
              onChange={(e) => setFeedbackOpenAt(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Closes At (optional)</label>
            <input
              type="datetime-local"
              value={feedbackCloseAt}
              onChange={(e) => setFeedbackCloseAt(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Avenue (optional)</label>
          <select
            value={avenueId}
            onChange={(e) => setAvenueId(e.target.value)}
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#180F04] bg-white focus:outline-none focus:border-[#D4A017]"
          >
            <option value="">All avenues (visible to every DCM)</option>
            {avenues.map((a) => (
              <option key={a.id} value={a.id}>{a.name} only</option>
            ))}
          </select>
          <p className="text-[10px] text-[#180F04]/40 mt-1">
            If this event belongs to one avenue, only that avenue's DCMs can view results. Filling stays open to everyone.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4A017]"
            />
            <span className="text-sm text-[#180F04]">Start with default question template</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4A017]"
            />
            <span className="text-sm text-[#180F04]">Activate immediately</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowResubmit}
              onChange={(e) => setAllowResubmit(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4A017]"
            />
            <span className="text-sm text-[#180F04]">Allow resubmission</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4A017]"
            />
            <span className="text-sm text-[#180F04]">Make public (anyone with the link can fill, no login needed)</span>
          </label>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4A017] text-[#180F04] py-2.5 rounded-lg text-sm font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Form"}
        </button>
      </form>
    </div>
  );
}
