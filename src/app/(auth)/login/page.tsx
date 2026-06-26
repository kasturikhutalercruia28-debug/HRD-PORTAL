'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }

      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      const role = session?.user?.role

      if (role === 'HRD') router.push('/hrd/dashboard')
      else if (role === 'DEC') router.push('/dec/dashboard')
      else if (role === 'DRR') router.push('/drr/dashboard')
      else router.push('/')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0D0B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="text-5xl font-bold tracking-tight"
            style={{ color: '#AAFF47', fontFamily: 'Fraunces, serif' }}
          >
            DPES
          </span>
          <p className="mt-2 text-xs tracking-widest uppercase text-[#F0EDE5]/50">
            Rotaract District 3141
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-center text-xs uppercase tracking-widest text-[#F0EDE5]/30 mb-6">
            District Performance Evaluation System
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-wider text-[#F0EDE5]/60"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@district3141.org"
                className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-[#F0EDE5] placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#AAFF47] focus:border-[#AAFF47] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-wider text-[#F0EDE5]/60"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-[#F0EDE5] placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#AAFF47] focus:border-[#AAFF47] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center py-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-9 rounded-md bg-[#AAFF47] text-[#0D0D0B] text-sm font-semibold tracking-wide hover:bg-[#99ee36] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-[#F0EDE5]/20">
          HRD Portal — Authorised access only
        </p>
      </div>
    </main>
  )
}
