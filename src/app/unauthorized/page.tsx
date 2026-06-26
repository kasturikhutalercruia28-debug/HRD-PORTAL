import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0B] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[#AAFF47] text-xs uppercase tracking-widest mb-3 font-['Geist']">
          403 — Forbidden
        </p>
        <h1 className="font-['Fraunces'] text-4xl font-semibold text-[#F0EDE5] mb-4">
          Access Denied
        </h1>
        <p className="font-['Geist'] text-[#F0EDE5]/60 text-sm mb-8">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-medium bg-[#AAFF47] text-[#0D0D0B] px-6 py-2.5 rounded-md hover:bg-[#99ee36] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
