import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const fixes = [
  { old: 'rc.gesac&sc@district3141.com',   new: 'rc.gesacsc@district3141.com' },
  { old: 'rc.mvmcoc&s@district3141.com',   new: 'rc.mvmcocs@district3141.com' },
  { old: 'rc.j-p@district3141.com',        new: 'rc.jesp@district3141.com' },
]

export async function GET() {
  const results = []
  for (const fix of fixes) {
    const user = await prisma.user.findUnique({ where: { email: fix.old } })
    if (!user) { results.push({ status: 'not_found', email: fix.old }); continue }
    await prisma.user.update({ where: { email: fix.old }, data: { email: fix.new } })
    results.push({ status: 'updated', old: fix.old, new: fix.new })
  }

  // Fix invisible-character emails by searching name
  const dyPatil = await prisma.user.findFirst({ where: { name: { contains: 'DY Patil International' } } })
  if (dyPatil) {
    await prisma.user.update({ where: { id: dyPatil.id }, data: { email: 'rc.dypatilis@district3141.com' } })
    results.push({ status: 'updated', name: dyPatil.name, new: 'rc.dypatilis@district3141.com' })
  }

  const prabhavati = await prisma.user.findFirst({ where: { name: { contains: 'Prabhavati' } } })
  if (prabhavati) {
    await prisma.user.update({ where: { id: prabhavati.id }, data: { email: 'rc.ppsijc@district3141.com' } })
    results.push({ status: 'updated', name: prabhavati.name, new: 'rc.ppsijc@district3141.com' })
  }

  return NextResponse.json({ results })
}
