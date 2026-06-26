import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ["DEC", "DRR"] } },
    include: { avenue: { select: { id: true, name: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, role, avenueId } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["DEC", "DRR"].includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be DEC or DRR." }, { status: 400 });
  }

  if (role === "DEC" && !avenueId) {
    return NextResponse.json({ error: "avenueId is required for DEC users" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  if (avenueId) {
    const avenue = await prisma.avenue.findUnique({ where: { id: avenueId } });
    if (!avenue) {
      return NextResponse.json({ error: "Avenue not found" }, { status: 404 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      avenueId: role === "DEC" ? avenueId : null,
      isActive: true,
    },
    include: { avenue: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ user }, { status: 201 });
}
