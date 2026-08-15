"use client";

import { RefreshCw, Home } from "lucide-react";

export default function ErrorScreen({
  error,
  reset,
  fullPage = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** true on the root/global boundary, where there's no sidebar left standing */
  fullPage?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center px-6 ${
        fullPage ? "min-h-screen bg-[#FBF7EE]" : "flex-1"
      }`}
    >
      <div className="max-w-md text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-[#D4A017]/15 flex items-center justify-center mx-auto mb-5">
          <RefreshCw size={22} className="text-[#D4A017]" />
        </div>
        <h1 className="font-['Fraunces'] text-xl font-bold text-[#180F04] mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-[#180F04]/55 mb-6 leading-relaxed">
          Team HRD is working on giving you a smoother experience on SYNC. This page hit a snag —
          it's usually temporary, so give it another try.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 bg-[#D4A017] text-[#180F04] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#b8860b] transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 border border-black/15 text-[#180F04] px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/5 transition-colors"
          >
            <Home size={14} />
            Go home
          </a>
        </div>
        {error?.digest && (
          <p className="text-[10px] text-[#180F04]/30 mt-6">
            If this keeps happening, share this code with Team HRD: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
