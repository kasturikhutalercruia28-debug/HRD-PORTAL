"use client";
import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";

type DcmRecord = {
  id: string;
  name: string;
  avenue: { name: string };
  dcmUsers: { id: string; email: string; isActive: boolean }[];
};

export default function HrdDcmUsersPage() {
  const [dcms, setDcms] = useState<DcmRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDcms() {
    const res = await fetch("/api/hrd/dcm-users");
    if (res.ok) { const data = await res.json(); setDcms(data); }
    setLoading(false);
  }

  useEffect(() => { loadDcms(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setSaving(true);
    const res = await fetch("/api/hrd/dcm-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dcmRecordId: selected, loginEmail: email, loginPassword: password }),
    });
    setSaving(false);
    if (res.ok) {
      setSuccess("DCM login created successfully");
      setSelected(""); setEmail(""); setPassword("");
      loadDcms();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create login");
    }
  }

  if (loading) return <div className="p-8 text-center text-[#0D0D0B]/40 text-sm">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B] mb-6">DCM Login Management</h1>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-black/5 p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#0D0D0B] mb-3">Create DCM Login</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            required
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white focus:outline-none focus:border-[#AAFF47]"
          >
            <option value="">Select DCM…</option>
            {dcms.map((d) => (
              <option key={d.id} value={d.id} disabled={d.dcmUsers.length > 0}>
                {d.name} — {d.avenue.name}{d.dcmUsers.length > 0 ? " (login exists)" : ""}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Login email"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#0D0D0B] bg-white placeholder:text-[#0D0D0B]/30 focus:outline-none focus:border-[#AAFF47]"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          {success && <p className="text-green-600 text-xs flex items-center gap-1"><Check size={12} /> {success}</p>}
          <button type="submit" disabled={saving} className="w-full bg-[#AAFF47] text-[#0D0D0B] py-2 rounded-lg text-sm font-semibold hover:bg-[#99ee36] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Plus size={15} /> {saving ? "Creating…" : "Create Login"}
          </button>
        </form>
      </div>

      {/* DCM list */}
      <h2 className="text-sm font-semibold text-[#0D0D0B] mb-3">All DCMs</h2>
      <div className="space-y-2">
        {dcms.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-black/5 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#0D0D0B]">{d.name}</p>
              <p className="text-xs text-[#0D0D0B]/50">{d.avenue.name}</p>
            </div>
            {d.dcmUsers.length > 0 ? (
              <div className="text-right">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Login created</span>
                <p className="text-[10px] text-[#0D0D0B]/40 mt-0.5">{d.dcmUsers[0].email}</p>
              </div>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No login</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
