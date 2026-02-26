
"use client"; 

import Link from "next/link"; 
import { useRouter } from "next/navigation"; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/components/ui/simple-toast";


const formSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
});

export default function LoginPage() { 
  const router = useRouter();
  const { toast } = useToast();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(values),
    });
  

    if (!res.ok) {
      throw new Error("로그인 실패");
    }

    const data: {
      role: "ADMIN" | "USER";
    } = await res.json();

    toast({
      title: "로그인 성공",
      description: "이동합니다.",
    });

    if (data.role === "ADMIN") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }

  } catch (error) {
    toast({
      title: "로그인 실패",
      description: "이메일 또는 비밀번호를 확인해주세요.",
      variant: "destructive",
    });
  }
}

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