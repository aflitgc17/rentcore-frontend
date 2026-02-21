import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";

export async function GET() {
  const count = await prisma.reservation.count({
    where: {
      status: ReservationStatus.PENDING,
    },
  });

  return Response.json({ count });
}
