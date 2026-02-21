import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";


export async function POST(req: Request) {
  try {
    const {
      name,
      email,
      password,
      birthday,
      phoneNumber,
      adminCode,
    } = await req.json();

    const parsedBirthday = new Date(birthday);


    if (isNaN(parsedBirthday.getTime())) {
      return NextResponse.json(
        { message: "생년월일 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 1. 필수값 체크
    if (!name || !email || !password || !adminCode) {
      return NextResponse.json(
        { message: "필수 입력값 누락" },
        { status: 400 }
      );
    }

    // 2. 관리자 인증 코드 검증
    if (adminCode !== process.env.ADMIN_SECRET_CODE) {
      return NextResponse.json(
        { message: "관리자 인증 코드가 올바르지 않습니다." },
        { status: 403 }
      );
    }

    // 3. 이메일 중복 체크
    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return NextResponse.json(
        { message: "이미 존재하는 이메일입니다." },
        { status: 409 }
      );
    }

    // 4. 비밀번호 해시
    const hashed = await bcrypt.hash(password, 10);

    // 5. 관리자 계정 생성
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        birthday: parsedBirthday,
        phoneNumber,
        role: UserRole.ADMIN,

        // 관리자 전용 (nullable)
        department: null,
        studentId: null,
        grade: null,
      },
    });

    return NextResponse.json({
      message: "관리자 계정 생성 완료",
      adminId: admin.id,
    });
  } catch (e) {
    return NextResponse.json(
      { message: "서버 오류" },
      { status: 500 }
    );
  }
}
