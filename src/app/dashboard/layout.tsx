"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  Camera,
  Home,
  LogOut,
  ShoppingCart,
  History,
  Presentation,
  CalendarCheck,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/toaster";

import {
  LayoutDashboard,
  Clapperboard,
  Bell,
  CalendarDays,
} from "lucide-react";

/**
 * 🔐 JWT 기반 사용자 타입
 * (/auth/me 응답과 정확히 일치)
 */
type UserView = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("http://localhost:4000/my/notifications", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error(err);
      }
    };

    // 처음 한 번 실행
    fetchNotifications();

    // 🔁 10초마다 자동 갱신
    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setUnreadCount(0);
    };

    window.addEventListener("notificationsUpdated", handleUpdate);

    return () => {
      window.removeEventListener("notificationsUpdated", handleUpdate);
    };
  }, []);


  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) throw new Error("no token");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("unauthorized");

        const data: UserView = await res.json();
        setUser(data);
      } catch {
        localStorage.removeItem("token");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);


  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (!user) return null;

  const displayName = user.name;
  const displayEmail = user.email;
  const avatarInitial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">

        <SidebarHeader>
          <div className="flex items-center justify-between p-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <RentCoreLogo />
            </Link>

            <SidebarTrigger />
          </div>
        </SidebarHeader>


        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard">
                  <Home />
                  <span>대시보드</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/equipment">
                  <Camera />
                  <span>장비 목록</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/cart">
                  <ShoppingCart />
                  <span>장바구니</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/reservations">
                  <Presentation />
                  <span>시설 예약</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/status">
                  <CalendarCheck />
                  <span>시설 예약 현황</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/requests">
                  <History />
                  <span>나의 대출 현황</span>
                  {unreadCount > 0 && (
                    <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full px-1">
                      {unreadCount}
                    </span>
                  )}
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


            {/* ✅ 관리자만 보이는 메뉴 */}
            {user.role === "ADMIN" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin">
                    <Settings />
                    <span>관리자 페이지</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <Separator className="my-2" />
          <div className="flex items-center gap-3 p-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{avatarInitial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{displayName}</span>
              <span className="text-xs text-muted-foreground">{displayEmail}</span>
            </div>
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  // 🔓 JWT 로그아웃
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
              >
                <LogOut />
                <span>로그아웃</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
