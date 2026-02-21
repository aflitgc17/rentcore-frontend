"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clapperboard, Bell, Search, CalendarDays } from "lucide-react";

export default function AdminDashboardPage() {
  const adminMenuItems = [
    {
      title: "장비 관리",
      description: "장비를 등록, 수정, 삭제하고 상태를 관리합니다.",
      href: "/admin/equipment",
      icon: <Clapperboard className="w-6 h-6" />,
    },
    {
      title: "대여/예약 요청 관리",
      description: "사용자의 장비 및 시설 대여/예약 요청을 승인하거나 거절합니다.",
      href: "/admin/requests",
      icon: <Bell className="w-6 h-6" />,
    },
    
    {
      title: "장비 대여 캘린더",
      description: "장비별 대여/예약 일정을 캘린더로 관리합니다.",
      href: "/admin/calendar",
      icon: <CalendarDays className="w-6 h-6" />,
    },

    {
      title: "시설 예약 캘린더",
      description: "시설별 예약 일정을 캘린더로 관리합니다.",
      href: "/admin/facility/calendar",
      icon: <CalendarDays className="w-6 h-6" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">관리자 대시보드</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminMenuItems.map((item) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      </div>
      </div>
    </div>
  );
}
