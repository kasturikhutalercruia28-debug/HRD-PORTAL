import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await req.json().catch(() => null);
  const endpoint = sub?.endpoint as string | undefined;
  const p256dh = sub?.keys?.p256dh as string | undefined;
  const authKey = sub?.keys?.auth as string | undefined;
  if (!endpoint || !p256dh || !authKey)
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  try {
    await (prisma as any).pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth: authKey, userAgent: req.headers.get("user-agent") },
      create: { userId, endpoint, p256dh, auth: authKey, userAgent: req.headers.get("user-agent") },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Push storage not ready" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) {
    await (prisma as any).pushSubscription
      .deleteMany({ where: { endpoint, userId } })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
