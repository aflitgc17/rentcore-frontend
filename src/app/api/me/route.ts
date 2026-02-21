import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return Response.json(null, { status: 401 });
  }

  try {
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return Response.json(null, { status: 404 });
    }

    return Response.json(user);
  } catch {
    return Response.json(null, { status: 401 });
  }
}