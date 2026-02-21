// src/app/api/my/status/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Authorization 헤더 없음" },
        { status: 401 }
      );
    }

    const res = await fetch("http://localhost:4000/my/status", {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { message: "백엔드 응답 실패", detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "서버 오류" },
      { status: 500 }
    );
  }
}
