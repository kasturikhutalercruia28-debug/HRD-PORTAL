import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  link?: string
) {
  const n = await prisma.notification.create({
    data: { userId, title, message, link: link ?? null },
  });
  await sendPushToUsers([userId], { title, body: message, url: link ?? "/" });
  return n;
}

export async function createNotificationsForRole(
  role: "HRD" | "DRR" | "CLUB" | "DCM" | "DEC",
  title: string,
  message: string,
  link?: string
) {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      message,
      link: link ?? null,
    })),
  });
  await sendPushToUsers(users.map((u) => u.id), { title, body: message, url: link ?? "/" });
}
