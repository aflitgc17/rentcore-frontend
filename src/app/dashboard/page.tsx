"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Camera, History, Presentation, CalendarCheck } from "lucide-react";

export default function DashboardPage() {
  type User = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

const [user, setUser] = useState<User | null>(null);


  const [loading, setLoading] = useState(true);


  useEffect(() => {
  const fetchMe = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("unauthorized");

      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  fetchMe();
}, []);

  
  const overviewItems = [
    { title: "장비 목록 바로가기", description: "대여 가능한 장비 목록을 확인하고 대여를 신청하세요.", href: "/dashboard/equipment", icon: <Camera className="w-6 h-6" /> },
    { title: "시설 예약하기", description: "편집실, 녹음실을 예약합니다", href: "/dashboard/reservations", icon: <Presentation className="w-6 h-6" /> },
    { 
      title: "시설 예약 현황", 
      description: "예약자 이름을 가린 전체 시설 예약 현황을 확인합니다.", 
      href: "/dashboard/status", 
      icon: <CalendarCheck className="w-6 h-6" />
    },
    {title: "나의 대출/예약 현황", description: "현재 대출 중이거나 예약한 장비 내역을 확인합니다.", href: "/dashboard/requests", icon: <History className="w-6 h-6" /> },
  ];

  const displayName = user?.name ?? "";


  if (loading) {
    return <div className="p-6 text-muted-foreground">불러오는 중…</div>;
  }

  if (!user) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
        <Button asChild>
          <Link href="/login">로그인하러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
      <h1 className="text-3xl">
        <span className="font-bold font-headline">안녕하세요,{user.name}님!</span> 
      </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {overviewItems.map((item) => (
          <Card key={item.title} className="flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-headline">{item.title}</CardTitle>
                {item.icon}
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild variant="outline" className="w-full h-12">
                <Link href={item.href}>
                  바로가기 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
