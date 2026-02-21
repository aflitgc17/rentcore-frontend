"use client";

import FullCalendar from "@fullcalendar/react";
import type { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* =========================
   유틸
========================= */
function toDate(v: any): Date | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v;
//   if (v instanceof Timestamp) return v.toDate();
  if (typeof v === "number") return new Date(v);
  const d = new Date(v); // ISO 문자열 등
  return isNaN(d.getTime()) ? null : d;
}

// FullCalendar의 end는 "배타"라서 마지막 날까지 칠하려면 +1일
function addOneDay(d: Date | null) {
  if (!d) return null;
  const nd = new Date(d);
  nd.setDate(nd.getDate() + 1);
  return nd;
}

// 여러 후보 키 중 첫 번째 존재하는 값을 반환
function pick<T = any>(obj: Record<string, any>, keys: string[], fallback?: T): T | undefined {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

// 간단한 이메일 형식 판별
function toEmail(v: any): string | null {
  const s = String(v ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

// KST 기준으로 YYYY-MM-DD HH:MM 표시
const KST = "Asia/Seoul";
function fmtYMDHM(d: Date | null) {
  if (!d) return "-";
  // 안전하게 Date로 보정
  const dd = new Date(d);
  const y = dd.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: KST,
  }).replace(/\.\s?/g, "-").replace(/-$/, ""); // "2025. 08. 26." → "2025-08-26"

  const t = dd.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: KST,
  });
  return `${y} ${t}`;
}


/* =========================
   타입/상수
========================= */
type FCEvent = {
  id: string;
  title: string;
  start: Date | string | null;
  end?: Date | string | null;
  allDay?: boolean;
  color?: string;
  extendedProps?: {
    status?: string;
    requester?: string;
    facilityId?: string;
    facilityName?: string;
    purpose?: string;
    docId?: string;
    rawFrom?: Date | null;
    rawTo?: Date | null;
    [key: string]: any;
  };
};

const STATUS_COLOR: Record<string, string> = {
  pending: "orange",
  requested: "orange",
  approved: "blue",
  reserved: "blue",
  inuse: "red",
  using: "red",
  finished: "gray",
  returned: "gray",
  canceled: "silver",
  rejected: "silver",
};

export default function FacilityCalendarPage() {
  const [events, setEvents] = useState<FCEvent[]>([]);
  const [filterText, setFilterText] = useState("");
  const [openEventModal, setOpenEventModal] = useState(false);
  const [clickedEvent, setClickedEvent] = useState<FCEvent | null>(null);
  
  useEffect(() => {
  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:4000/facility-reservations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("예약 데이터 불러오기 실패");
      }

      const data = await res.json();

      const list: FCEvent[] = data.map((item: any) => {
        const fromRaw = toDate(item.startDate);
        const toRaw = toDate(item.endDate);

        const status = String(item.status).toLowerCase();
        const color = STATUS_COLOR[status] || "blue";

        return {
          id: item.id,
          title: `${item.facility.name} · ${item.user.email}`,
          start: fromRaw,
          end: addOneDay(toRaw || fromRaw),
          allDay: true,
          color,
          extendedProps: {
            status,
            requesterEmail: item.user.email,
            facilityName: item.facility.name,
            facilityId: item.facilityId,
            purpose: item.purpose,
            rawFrom: fromRaw,
            rawTo: toRaw,
          },
        };
      });

      setEvents(list);

    } catch (err) {
      console.error(err);
    }
  };

  fetchReservations();
}, []);

  

  // 텍스트 필터 (시설/신청자/목적)
  const filteredEvents = useMemo(() => {
    if (!filterText.trim()) return events;
    const q = filterText.toLowerCase();
    return events.filter((e) => {
      const t = `${e.title} ${(e.extendedProps?.purpose || "")}`.toLowerCase();
      return t.includes(q);
    });
  }, [events, filterText]);

  const renderEventContent = (arg: any) => {
    const [facility, who] = String(arg.event.title).split(" · ");
    return (
      <div className="leading-tight">
        <div className="font-medium truncate">{facility}</div>
        <div className="text-xs opacity-80 truncate">👤 {who}</div>
      </div>
    );
  };

  const handleEventClick = (info: any) => {
    const ev = info.event;
    const e: FCEvent = {
      id: ev.id,
      title: ev.title,
      start: (ev.start ?? null) as Date | null,
      end: (ev.end ?? null) as Date | null,
      allDay: ev.allDay,
      color: ev.backgroundColor,
      extendedProps: ev.extendedProps as FCEvent["extendedProps"],
    };
    setClickedEvent(e);
    setOpenEventModal(true);
  };

  return (
    <div className="p-6">
      {/* 헤더 & 범례 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">시설 예약 캘린더</h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "orange" }} />
            <span>예약됨</span>
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={filteredEvents as EventInput[]}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        height="80vh"
        eventDisplay="block"
      />

      {/* 상세 모달 */}
      <Dialog open={openEventModal} onOpenChange={setOpenEventModal}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>시설 예약 상세</DialogTitle>
            <DialogDescription>선택한 일정의 상세 정보입니다.</DialogDescription>
          </DialogHeader>

          {clickedEvent && (() => {
            const [facility, who] = clickedEvent.title.split(" · ");
            const ext = clickedEvent.extendedProps || {};
            const from = ext.rawFrom ? new Date(ext.rawFrom) : (clickedEvent.start ? new Date(clickedEvent.start as Date) : null);
            const to = ext.rawTo ? new Date(ext.rawTo) : (clickedEvent.end ? new Date(clickedEvent.end as Date) : null);

            return (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">시설</p>
                  <p className="font-medium">{ext.facilityName || facility}</p>
                  {ext.facilityId && <p className="text-xs">ID: {ext.facilityId}</p>}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">신청자 (이메일)</p>
                  <p>{ext.requesterEmail || "-"}</p>
                </div>


                {ext.purpose && (
                  <div>
                    <p className="text-sm text-muted-foreground">목적</p>
                    <p className="whitespace-pre-wrap">{ext.purpose}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">기간</p>
                  <p>{fmtYMDHM(from)}</p>
                  <p>{fmtYMDHM(to)}</p>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button onClick={() => setOpenEventModal(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
