"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePendingRequest } from "@/contexts/PendingRequestContext";


import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";

import { RentCoreLogo } from "@/components/rentcore-logo";

import {
  LayoutDashboard,
  Clapperboard,
  Bell,
  LogOut,
  CalendarDays,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge"; 


type AdminUserView = {
  name: string;
  email: string;
  avatar: string | null;
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUserView | null>(null);
  const [loading, setLoading] = useState(true);
  

  const router = useRouter();


 const { pendingCount, setPendingCount } = usePendingRequest();
// {pendingCount > 0 && (
//   <Badge variant="destructive">
//     {pendingCount}
//   </Badge>
// )}

useEffect(() => {
  const fetchPendingCount = async () => {
    try {
      const [rentalRes, facilityRes] = await Promise.all([
        fetch("http://localhost:4000/admin/rental-requests/count", {
          credentials: "include",
        }),
        fetch("http://localhost:4000/admin/facility-requests/count", {
          credentials: "include",
        }),
      ]);

      if (!rentalRes.ok || !facilityRes.ok) return;

      const rentalData = await rentalRes.json();
      const facilityData = await facilityRes.json();

      const total =
        (rentalData.count ?? 0) +
        (facilityData.count ?? 0);

      setPendingCount(total);

    } catch (e) {
      console.error("pending count 불러오기 실패", e);
    }
  };

  fetchPendingCount();
}, [setPendingCount]);


useEffect(() => {
  async function checkAdmin() {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!res.ok) {
      router.replace("/login");
      return;
    }

    const data = await res.json();

    if (data.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    setUser({
      name: data.name,
      email: data.email,
      avatar: null,
    });

    setLoading(false);
  }

  checkAdmin();
}, [router]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>권한 확인 중...</p>
      </div>
    );
  }

  const displayName = user?.name ?? "관리자";
  const displayEmail = user?.email ?? "";
  const avatarSrc = user?.avatar ?? "";
  const avatarInitial = (displayName?.[0] ?? "A").toUpperCase();

  return (
  
    <SidebarProvider>
      <Sidebar collapsible="icon">

        {/* ===============================
            사이드바 헤더
        =============================== */}

        <SidebarHeader>
          <div className="flex items-center justify-between p-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <RentCoreLogo />
            </Link>

            <SidebarTrigger />
          </div>
        </SidebarHeader>

        {/* ===============================
             사이드바 메뉴
        =============================== */}
        <SidebarContent className="p-2">
          <div className="px-4 py-2 text-sm font-semibold text-muted-foreground">
            관리자 메뉴
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="대시보드">
                <Link href="/admin">
                  <LayoutDashboard />
                  <span>대시보드</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="장비 관리">
                <Link href="/admin/equipment">
                  <Clapperboard />
                  <span>장비 관리</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* ===============================
                대여 요청 + 숫자 배지
            =============================== */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  href="/admin/requests"
                  className="flex items-center justify-between w-full"
                >
                  {/* 왼쪽 묶음 */}
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 shrink-0" />
                    <span>대여 요청</span>
                  </div>

                  {pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="장비 대여 캘린더">
                <Link href="/admin/calendar">
                  <CalendarDays />
                  <span>장비 대여 캘린더</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="시설 예약 캘린더">
                <Link href="/admin/facility/calendar">
                  <CalendarDays />
                  <span>시설 예약 캘린더</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="학과 홈페이지">
                <a
                  href="https://ia.sunmoon.ac.kr/ia/index.do"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarDays />
                  <span>영화영상학과 홈페이지</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>

        {/* ===============================
             사이드바 푸터
        =============================== */}
        <SidebarFooter>
          <Separator className="my-2" />

          <div className="flex items-center gap-3 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback>{avatarInitial}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <span className="font-semibold text-sm">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                {displayEmail}
              </span>
            </div>
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="로그아웃"
                onClick={async () => {
                  await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                  });
                  router.replace("/login");
                }}
              >
                <LogOut />
                <span>로그아웃</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ===============================
          메인 콘텐츠 영역
      =============================== */}
      <SidebarInset className="flex flex-col">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}