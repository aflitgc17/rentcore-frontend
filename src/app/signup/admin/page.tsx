
"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { format } from "date-fns";
import { CalendarIcon, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordInput } from "@/components/password-input";
import { Toaster } from "@/components/ui/toaster";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/simple-toast";


// 관리자 인증 코드
const ADMIN_SECRET_CODE = "123456789";

const formSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),

  email: z
    .string()
    .email("유효한 이메일 주소를 입력해주세요.")
    .refine(
      (email) => email.endsWith("@sunmoon.ac.kr"),
      "선문대학교 이메일(@sunmoon.ac.kr)을 사용해야 합니다."
    )
    .refine(
      (email) => /[A-Za-z]/.test(email.split("@")[0]),
      "이메일 아이디 부분에 영문이 포함되어야 합니다."
    )
    .refine(
      (email) => /\d/.test(email.split("@")[0]),
      "이메일 아이디 부분에 숫자가 포함되어야 합니다."
    ),
  
  
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      "비밀번호는 영문과 숫자를 포함해야 합니다."
    ),

  confirmPassword: z.string(),
  birthday: z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD)"
),
  phoneNumber: z.string().min(10, "유효한 전화번호를 입력해주세요.").regex(/^010\d{8}$/, "전화번호는 010으로 시작하는 11자리 숫자여야 합니다."),
  // 접근 코드는 클라이언트에서 '검증'하지 않고, 서버에서 검증합니다.
  adminCode: z.string().min(1, "관리자 인증 코드를 입력해주세요."),
}).refine(data => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

export default function AdminSignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthday: "",
      phoneNumber: "",
      adminCode: "",
    },
  });

  
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
  setLoading(true);
  try {
    const res = await fetch("/api/admin/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
        birthday: values.birthday,
        phoneNumber: values.phoneNumber,
        adminCode: values.adminCode,
      }),
    });

    const data = await res.json();

        if (!res.ok) {
          // 이메일 중복 등 400 에러일 경우
          if (res.status === 400) {
            form.setError("email", {
              type: "manual",
              message: data.message,
            });
            return;
          }

          throw new Error(data.message || "회원가입 실패");
        }

    toast({
      title: "관리자 계정 생성 완료",
      description: "이제 관리자 로그인을 진행해주세요.",
    });

    // ✅ 회원가입 후에는 로그인 페이지로
    router.replace("/login?role=admin");
  } catch (err: any) {
    toast({
      title: "회원가입 실패",
      description: err.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}


  return (
    <AuthLayout>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">관리자 회원가입</CardTitle>
          <CardDescription>관리자 계정을 생성합니다.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="h-[400px] pr-6">
                <div className="space-y-4">
                  
                  <Alert variant="destructive">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>관리자 전용</AlertTitle>
                    <AlertDescription>
                      이 페이지는 관리자 등록을 위한 페이지입니다. 별도로 안내받은 인증 코드를 입력해야 합니다.
                    </AlertDescription>
                  </Alert>

                  <FormField control={form.control} name="adminCode" render={({ field }) => (
                    <FormItem><FormLabel>관리자 인증 코드</FormLabel><FormControl><Input placeholder="인증 코드 입력" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>이름</FormLabel><FormControl><Input placeholder="홍길동" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>이메일 (ID)</FormLabel><FormControl><Input placeholder="user123@sunmoon.ac.kr" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>비밀번호</FormLabel><FormControl><PasswordInput placeholder="영문, 숫자 포함 8자 이상" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>비밀번호 확인</FormLabel><FormControl><PasswordInput placeholder="비밀번호 재입력" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField 
                    control={form.control} 
                    name="birthday" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>생년월일</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>전화번호</FormLabel><FormControl><Input placeholder="01012345678" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </ScrollArea>
              <Button type="submit" className="w-full mt-4">관리자 계정 생성</Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <div className="text-sm text-muted-foreground">
            일반 사용자이신가요?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              일반 회원가입
            </Link>
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
