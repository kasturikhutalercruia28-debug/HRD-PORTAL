"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DcmNewComplaintPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dcm/complaints");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit complaint");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B] mb-6">New Complaint</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0B] mb-1.5">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Brief subject of the complaint"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0B] mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            placeholder="Describe the complaint in detail"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47] resize-none"
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-black/15 text-[#0D0D0B] py-2 rounded-lg text-sm hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#AAFF47] text-[#0D0D0B] py-2 rounded-lg text-sm font-semibold hover:bg-[#99ee36] transition-colors disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
