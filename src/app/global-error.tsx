"use client";

import { RefreshCw, Home } from "lucide-react";

// This one catches errors thrown by the ROOT layout itself (e.g. inside
// SessionProvider/ThemeProvider), so it must render its own <html>/<body> —
// it fully replaces everything, including src/app/layout.tsx. Kept
// dependency-free (no shared ErrorScreen import, no custom fonts) since if
// the root layout is broken, we want this to have the best chance of still
// rendering something.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FBF7EE" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#180F04", marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "rgba(24,15,4,0.6)", marginBottom: 24, lineHeight: 1.6 }}>
              Team HRD is working on giving you a smoother experience on SYNC. Please try again in a
              moment.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={reset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#D4A017",
                  color: "#180F04",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} />
                Try again
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid rgba(0,0,0,0.15)",
                  color: "#180F04",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                <Home size={14} />
                Go home
              </a>
            </div>
            {error?.digest && (
              <p style={{ fontSize: 10, color: "rgba(24,15,4,0.3)", marginTop: 24 }}>
                If this keeps happening, share this code with Team HRD: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
