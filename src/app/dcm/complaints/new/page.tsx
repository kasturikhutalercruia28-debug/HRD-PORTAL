import { Suspense } from "react";
import ComplaintForm from "./ComplaintForm";

export default function DcmNewComplaintPage() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-6">New Complaint</h1>
      <Suspense fallback={<div className="bg-white rounded-xl border border-black/5 p-6 text-sm text-[#180F04]/40">Loading…</div>}>
        <ComplaintForm />
      </Suspense>
    </div>
  );
}
