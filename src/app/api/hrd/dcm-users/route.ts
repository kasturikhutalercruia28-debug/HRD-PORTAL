import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "HRD") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dcms = await prisma.dcm.findMany({
    where: { isActive: true },
    include: {
      avenue: { select: { name: true } },
      dcmUsers: { select: { id: true, email: true, isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(dcms);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "HRD") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { dcmRecordId, loginEmail, loginPassword } = body;

  if (!dcmRecordId || !loginEmail || !loginPassword) {
    return NextResponse.json({ error: "dcmRecordId, loginEmail, loginPassword required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const dcm = await prisma.dcm.findUnique({ where: { id: dcmRecordId } });
  if (!dcm) return NextResponse.json({ error: "DCM record not found" }, { status: 404 });

  const passwordHash = await bcrypt.hash(loginPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      name: dcm.name,
      email: loginEmail.trim().toLowerCase(),
      passwordHash,
      role: "DCM",
      dcmRecordId,
    },
  });

  return NextResponse.json({ id: newUser.id, name: newUser.name }, { status: 201 });
}
