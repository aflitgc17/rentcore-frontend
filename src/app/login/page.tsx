
"use client"; 

import Link from "next/link"; //페이지 간 이동을 위한 링크 컴포넌트
import { useRouter } from "next/navigation"; //페이지를 코드로 이동시킬 수 있는 기능(router.push("/") 등)
import { useForm } from "react-hook-form";//입력폼을 쉽게 관리해주는 도구
import { zodResolver } from "@hookform/resolvers/zod";//zod로 만든 입력검사 규칙을 form에 적용해주는 연결 도구
import * as z from "zod";//입력값 유효성 검사(형식 검사 등)를 해주는 라이브러리

import { Button } from "@/components/ui/button";//커스텀 디자인된 버튼 컴포넌트
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";//로그인 화면 전체를 카드 형식으로 이쁘게 감싸주는 UI 도구
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";//로그인 폼을 구성하는 구성요소들이야 (라벨, 입력창 등
import { Input } from "@/components/ui/input";//기본 텍스트 입력창
import { AuthLayout } from "@/components/auth-layout";//로그인 페이지 전체의 기본 레이아웃을 잡는 틀
import { PasswordInput } from "@/components/password-input";//비밀번호 입력용 Input (입력 숨김 기능 포함)
import { useToast } from "@/components/ui/simple-toast";


// 이메일 + 비밀번호 로그인 폼

//입력값 검사 규칙 정의 (zod 사용)
//입력된 이메일이 유효한지, 비밀번호가 비어있지 않은지를 체크하는 규칙이야.
const formSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
});

//라우터와 토스트 생성

//페이지 이동(router)과 메시지 출력(toast)을 위한 도구 준비
export default function LoginPage() { //로그인 화면 전체를 만드는 컴포넌트 함수의 시작이야
  const router = useRouter();
  const { toast } = useToast();

//form 객체 생성
//입력폼 초기화: 이메일과 비밀번호 빈 값으로 시작 + 유효성 검사 규칙 연결
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(values),
    });
    // console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);

    // console.log("res.ok:", res.ok);

    if (!res.ok) {
      throw new Error("로그인 실패");
    }
    // console.log("res.status:", res.status);

    const data: {
      token: string;
      role: "ADMIN" | "USER";
    } = await res.json();

    // ✅ JWT 저장
    localStorage.setItem("token", data.token);

    toast({
      title: "로그인 성공",
      description: "이동합니다.",
    });

    // ✅ 역할에 따라 이동
    if (data.role === "ADMIN") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }

    // console.log("이동 호출 완료");

  } catch (error) {
    toast({
      title: "로그인 실패",
      description: "이메일 또는 비밀번호를 확인해주세요.",
      variant: "destructive",
    });
  }
}

  //실제 화면에 보이는 로그인 UI 구성

  //레이아웃과 카드 형태로 화면 전체 틀 구성 시작
  return (
    <AuthLayout>
      <Card className="w-full">

    {/* //위쪽 제목과 설명 텍스트 */}
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">로그인</CardTitle>
          <CardDescription>이메일과 비밀번호로 로그인하세요.</CardDescription>
        </CardHeader>

        {/* //이메일과 비밀번호 입력폼 정의 */}
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
        {/* //이메일/비밀번호 입력창과 로그인 버튼 */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 (ID)</FormLabel>
                    <FormControl>
                      <Input placeholder="example@sunmoon.ac.kr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">로그인</Button>
            </form>
          </Form>
        </CardContent>

        {/* //아래쪽에 비번 재설정 & 회원가입 링크 */}
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              회원가입
            </Link>
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}