"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import koLocale from "@fullcalendar/core/locales/ko";
import { format } from "date-fns";

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

function maskName(name?: string | null) {
  if (!name) return "익명";
  const first = name[0] ?? "";
  return first + "＊".repeat(Math.max(1, name.length - 1));
}

export default function FacilityCalendarLikeScreenshot() {
  const [facility, setFacility] = useState<"전체" | "편집실" | "녹음실">("전체");
  const [rows, setRows] = useState<any[]>([]);

  // 날짜 클릭/이벤트 클릭 시: 해당 날짜 예약들 보여주기
  const [openDayModal, setOpenDayModal] = useState(false);
  const [dayReservations, setDayReservations] = useState<any[]>([]);
  const [dayKey, setDayKey] = useState<string>("");

  useEffect(() => {
    async function fetchReservations() {
      const params =
        facility === "전체" ? "" : `?facility=${encodeURIComponent(facility)}`;

      const res = await fetch(`/api/facility-reservations${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("예약 조회 실패");
        return;
      }

      const data = await res.json();
      setRows(data);
    }

    fetchReservations();
  }, [facility]);

  
  const { events, grouped } = useMemo(() => {
    const visible = rows.filter((r) => r.status === "APPROVED");

    const g: Record<string, any[]> = {};
    visible.forEach((r) => {
      const s = toDate(r.startAt);
      if (!s) return;
      const key = format(s, "yyyy-MM-dd"); 
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });

    const ev: EventInput[] = Object.entries(g).map(([date, list]) => ({
      id: date,
      title: `${list.length}건`,
      start: date, 
      allDay: true,
      extendedProps: { reservations: list, date },
    }));

    return { events: ev, grouped: g };
  }, [rows]);

  return (
    <div className="px-6 pt-2 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">시설 예약 캘린더</h1>
      </div>

        <CardContent>
          {/* (원하면 탭/필터 UI는 살려도 되는데 사진에는 없어서 일단 숨김)
              필요하면 여기서 facility setFacility로 필터 유지 가능 */}

          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={koLocale}
            headerToolbar={{
              left: "",
              center: "title",
              right: "today prev,next",
            }}
            buttonText={{ today: "오늘" }}
            height="auto"
            expandRows={true}
            events={events}
            eventDisplay="block"

            // 사진처럼: 이벤트 배경/테두리 없애고 "pill"만 보이게
            eventBackgroundColor="transparent"
            eventBorderColor="transparent"

            // 날짜 숫자만 깔끔하게
            dayCellContent={(arg) => arg.date.getDate()}

            // 사진처럼: 가운데 검은 pill에 “N건”
            eventContent={(arg) => (
              <div className="flex justify-center items-center">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-black text-white">
                  {arg.event.title}
                </span>
              </div>
            )}

            //  날짜 칸 클릭하면 그 날짜 예약 목록 모달
            dateClick={(info) => {
              const key = info.dateStr; // yyyy-mm-dd
              setDayKey(key);
              setDayReservations(grouped[key] ?? []);
              setOpenDayModal(true);
            }}

            // pill 클릭해도 동일하게 목록 모달
            eventClick={(info) => {
              const list = info.event.extendedProps?.reservations ?? [];
              const key = info.event.id;
              setDayKey(key);
              setDayReservations(list);
              setOpenDayModal(true);
            }}
          />
        </CardContent>

      {/*  날짜별 예약 목록 모달 (필요 없으면 삭제 가능) */}
      <Dialog open={openDayModal} onOpenChange={setOpenDayModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>해당 날짜 예약 목록</DialogTitle>
            <DialogDescription>
              {dayKey ? `${dayKey} 예약 ${dayReservations.length}건` : "예약 목록"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[420px] overflow-y-auto text-sm">
            {dayReservations.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                예약이 없습니다.
              </div>
            ) : (
              dayReservations.map((r: any, idx: number) => (
                <div key={r.id} className="p-3 border rounded">
                  <div className="font-semibold">
                    {idx + 1}. {r?.facility?.name ?? "-"}
                  </div>

                  <div className="text-muted-foreground">
                    {format(new Date(r.startAt), "HH:mm")} ~ {format(new Date(r.endAt), "HH:mm")}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setOpenDayModal(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}