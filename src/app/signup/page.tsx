"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { ko } from "date-fns/locale";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { useToast } from "@/components/ui/simple-toast";


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

  studentId: z.string().optional(),

  password: z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
    "비밀번호는 영문과 숫자를 포함해야 합니다."
  ),

  confirmPassword: z.string(),

  grade: z.enum(["1", "2", "3", "4", "교수"]),

  department: z.string().optional(),

  birthday: z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "생년월일 형식은 YYYY-MM-DD 입니다."
),
  phoneNumber: z
  .string().min(10, "유효한 전화번호를 입력해주세요.").regex(/^010\d{8}$/, "전화번호는 010으로 시작하는 11자리 숫자여야 합니다."),
})

// 학생일 때만 학과 필수
  .refine(
    (data) => {
      if (data.grade === "교수") return true;
      return !!data.department;
    },
    {
      message: "학생은 학과를 선택해야 합니다.",
      path: ["department"],
    }
  )

  .refine(
  (data) => {
    if (!data.studentId) return false;

    if (data.grade === "교수") {
      return /^\d{7}$/.test(data.studentId);
    }

    return /^\d{10}$/.test(data.studentId);
  },
  {
    message: "학생은 10자리, 교수는 7자리 숫자 학번이어야 합니다.",
    path: ["studentId"],
  }
)



  // 비밀번호 확인
.refine(data => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});



export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      studentId: "",
      password: "",
      confirmPassword: "",
      grade: undefined,
      department: "",
      birthday: "",
      phoneNumber: "",
    },
  });

  const selectedGrade = form.watch("grade");

    async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: values.name,
            email: values.email,
            password: values.password,
            studentId: values.studentId,
            grade: values.grade,
            department: values.department,
            birthday: values.birthday,
            phoneNumber: values.phoneNumber,
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
        title: "회원가입 성공",
        description: "로그인 페이지로 이동합니다。",
        });

        router.push("/login");
    } catch (error: any) {
        console.error("회원가입 실패:", error);
        toast({
        title: "회원가입 실패",
        description: error.message || "요청 중 오류가 발생했습니다。",
        variant: "destructive",
        });
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">회원가입</CardTitle>
          <CardDescription>계정을 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="h-[400px] pr-6">
                <div className="space-y-4">
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

                  
                  {/*  드롭다운: 학년 */}
                  <FormField control={form.control} name="grade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>학년</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === "교수") {
                            form.setValue("department", "");
                            form.setValue("studentId", "");
                          }
                        }}
                        defaultValue={field.value}
                      >

                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="학년을 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1학년</SelectItem>
                          <SelectItem value="2">2학년</SelectItem>
                          <SelectItem value="3">3학년</SelectItem>
                          <SelectItem value="4">4학년</SelectItem>
                          <SelectItem value="교수">교수</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>학번</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              selectedGrade === "교수"
                                ? "1234567 (7자리)"
                                : "2024000000 (10자리)"
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  {/*  드롭다운: 학과 */}
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>학과</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={selectedGrade === "교수"}
                      >
                        
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="학과를 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="역사문화콘텐츠학부">역사문화콘텐츠학부</SelectItem>
                          <SelectItem value="역사문화콘텐츠학과">역사문화콘텐츠학과</SelectItem>
                          <SelectItem value="역사・영상콘텐츠학부">역사・영상콘텐츠학부</SelectItem>
                          <SelectItem value="영상예술학과">영상예술학과</SelectItem>
                          <SelectItem value="영화영상학과">영화영상학과</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />


                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>생년월일</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="justify-start text-left font-normal"
                              >
                                {field.value ? (
                                  format(new Date(field.value), "yyyy-MM-dd")
                                ) : (
                                  <span className="text-muted-foreground">
                                    날짜를 선택해주세요
                                  </span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  form.setValue("birthday", format(date, "yyyy-MM-dd"));
                                }
                              }}
                              captionLayout="dropdown"
                              fromYear={1950}
                              toYear={new Date().getFullYear()}
                              locale={ko}
                              formatters={{
                                formatMonthDropdown: (date) => format(date, "M월", { locale: ko }),
                                formatMonthCaption: (date) => format(date, "yyyy년 M월", { locale: ko }),
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>전화번호</FormLabel><FormControl><Input placeholder="01012345678" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </ScrollArea>
              <Button type="submit" className="w-full mt-4">계정 생성</Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              로그인
            </Link>
          </div>
           <div className="text-sm text-muted-foreground">
            관리자이신가요?{" "}
            <Link href="/signup/admin" className="font-semibold text-primary hover:underline">
              관리자 회원가입
            </Link>
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}

