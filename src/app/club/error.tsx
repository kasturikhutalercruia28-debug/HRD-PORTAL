"use client";

import ErrorScreen from "@/components/ErrorScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Not fullPage — this renders inside the portal's own layout, so the
  // sidebar/topbar stay put and only the content area shows the error.
  return <ErrorScreen error={error} reset={reset} />;
}
