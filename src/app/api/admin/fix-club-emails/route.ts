import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function toSlug(name: string): string {
  let n = name.replace(/^rotaract\s+club\s+of\s+/i, '').trim()
  const words = n.split(/\s+/).filter(Boolean)
  let slug: string
  if (words.length <= 2) {
    slug = words.join('').toLowerCase().replace(/[^a-z0-9]/g, '')
  } else {
    slug = words.map(w => w[0].toLowerCase()).join('')
  }
  return slug || 'club'
}

export async function GET() {
  const clubs = await prisma.user.findMany({
    where: { role: 'CLUB' },
    select: { id: true, email: true, name: true },
    orderBy: { name: 'asc' },
  })

  const alreadyCorrect = clubs.filter(c => c.email.startsWith('rc.') && c.email.endsWith('@district3141.com'))
  const needsUpdate = clubs.filter(c => !c.email.startsWith('rc.') || !c.email.endsWith('@district3141.com'))

  const usedEmails = new Set(alreadyCorrect.map(c => c.email))
  const updates: { id: string; oldEmail: string; newEmail: string; name: string }[] = []

  for (const club of needsUpdate) {
    const slug = toSlug(club.name ?? club.email)
    let candidate = `rc.${slug}@district3141.com`
    let i = 2
    while (usedEmails.has(candidate)) {
      candidate = `rc.${slug}${i}@district3141.com`
      i++
    }
    usedEmails.add(candidate)
    updates.push({ id: club.id, oldEmail: club.email, newEmail: candidate, name: club.name ?? '' })
  }

  for (const u of updates) {
    await prisma.user.update({ where: { id: u.id }, data: { email: u.newEmail } })
  }

  return NextResponse.json({
    updated: updates.length,
    skipped: alreadyCorrect.length,
    changes: updates.map(u => ({ name: u.name, old: u.oldEmail, new: u.newEmail })),
  })
}
