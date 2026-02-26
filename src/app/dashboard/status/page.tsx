"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; 
import { Button } from "@/components/ui/button"; 

type FSVal = Date | string | null | undefined;

const toDate = (v: FSVal) => {
  if (!v) return null;
  return typeof v === "string" ? new Date(v) : v;
};

const hhmm = (d: Date | null) => {
    if (!d) return ""; 
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

function maskName(name?: string | null) {
  if (!name) return "익명";
  const first = name[0] ?? "";
  return first + "＊".repeat(Math.max(1, name.length - 1)); 
}

export default function ReservationsStatusPage() {
  const [facility, setFacility] = useState<"전체" | "편집실" | "녹음실">("전체");
  const [rows, setRows] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null); 


useEffect(() => {
  async function fetchReservations() {
    const params =
      facility === "전체" ? "" : `?facility=${encodeURIComponent(facility)}`;

    const res = await fetch(
      `/api/facility-reservations${params}`,
      {
        credentials: "include", 
      }
    );

    if (!res.ok) {
      console.error("예약 조회 실패");
      return;
    }

    const data = await res.json();
    setRows(data);
  }

  fetchReservations();
}, [facility]);


  const events: EventInput[] = useMemo(() => {
    return rows.map(r => {
      const s = toDate(r.startAt)!;
      const e = toDate(r.endAt)!;
      const title = `${r.purpose ?? "시설 예약"} · 팀 ${r.headcount ?? 1}명 · 신청자 ${maskName(r?.requester?.name)}`;

      let color = "#FDBA74"; 
      if (r.facility?.name === "편집실") color = "#FDBA74";
      if (r.facility?.name === "녹음실") color = "#a6cb60";

      return {
        id: r.id,
        title,
        start: s,
        end: e,
        display: "block",
        color, 
        extendedProps: r, 
      } as EventInput;
    });
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">시설 예약 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={facility} onValueChange={(v) => setFacility(v as any)} className="w-full mb-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="전체">전체</TabsTrigger>
              <TabsTrigger value="편집실">편집실</TabsTrigger>
              <TabsTrigger value="녹음실">녹음실</TabsTrigger>
            </TabsList>
            <TabsContent value={facility} />
          </Tabs>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            events={events}
            height="auto"
            eventClick={(info) => {
              setSelectedEvent(info.event.extendedProps); 
            }}
          />

            {/* 색상 범례 */}
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: "#FDBA74" }}
                />
                편집실
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: "#a6cb60" }}
                />
                녹음실
              </div>
            </div>

        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>시설 예약 상세</DialogTitle>
            <DialogDescription>선택한 일정의 상세 정보입니다.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4 text-sm">
            <div>
                <p className="text-muted-foreground">시설</p>
                <p className="font-medium">{selectedEvent?.facility?.name}</p>
            </div>

            <div>
                <p className="text-muted-foreground">목적</p>
                <p className="font-medium">{selectedEvent?.purpose}</p>
            </div>

            <div>
                <p className="text-muted-foreground">기간</p>
                <p className="font-medium">
                {toDate(selectedEvent?.startAt)?.toLocaleDateString()}{" "}
                {hhmm(toDate(selectedEvent?.startAt))}
                <br />
                {toDate(selectedEvent?.endAt)?.toLocaleDateString()}{" "}
                {hhmm(toDate(selectedEvent?.endAt))}
                </p>
            </div>
            </div>

            <DialogFooter className="mt-6">
            <Button onClick={() => setSelectedEvent(null)}>닫기</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    </div>
  );
}
