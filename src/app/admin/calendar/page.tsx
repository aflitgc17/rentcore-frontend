"use client";

import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/simple-toast";
import { format } from "date-fns";

import { useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";




interface ReservationItem {
  equipment: {
    id: number;
    name: string;
    managementNumber?: string;
  };
}

interface CalendarReservation {
  id: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  status: string;
  subjectName?: string;  
  purpose?: string; 
  user: {
    name: string;
    studentId?: string;
  };
  items: ReservationItem[];
}


function getStatusLabel(status?: string) {
  switch (status) {
    case "REQUESTED":
      return "요청됨";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "거절됨";
    default:
      return status ?? "알 수 없음";
  }
}


function calculateMaxReturnDate(start: Date) {
  const day = start.getDay();

  // 금요일
  if (day === 5) {
    const monday = new Date(start);
    monday.setDate(start.getDate() + 3);
    return monday;
  }

  // 일반 평일 → 최대 3일
  const max = new Date(start);
  max.setDate(start.getDate() + 2);
  return max;
}


function toDate(v: any): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  return new Date(v); // ISO 문자열 등
}

// FullCalendar는 end가 "배타"라서 마지막 날까지 칠하려면 +1일
function addOneDay(d: Date) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + 1);
  return nd;
}

// date(자정 기준)이 start <= date < end 인지 체크
function occursOn(date: Date, start: Date, endExclusive?: Date) {
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // 자정
  const s0 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e0 = endExclusive
    ? new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate())
    : undefined;

  if (!e0) return s0.getTime() === d0.getTime(); // end 없는 단일일정
  return s0.getTime() <= d0.getTime() && d0.getTime() < e0.getTime();
}

type FCEvent = {
  id: string;
  title: string;            
  start: Date | string | null;   
  end?: Date | string | null;    
  allDay?: boolean;
  color?: string;
  extendedProps?: {
    userName?: string;
    status?: string;            
    requester?: string;          
    equipmentId?: string;
    managementNumber?: string;
    docId?: string;
    rawFrom?: Date;
    rawTo?: Date;
    [key: string]: any;          
  };
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<FCEvent[]>([]);

  const [openDayModal, setOpenDayModal] = useState(false);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [dayEvents, setDayEvents] = useState<CalendarReservation[]>([]);

  const [openEventModal, setOpenEventModal] = useState(false);
  const [clickedEvent, setClickedEvent] = useState<FCEvent | null>(null);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);

  const [reservedEquipments, setReservedEquipments] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const calendarRef = useRef<any>(null);  

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);

  const [editRange, setEditRange] = useState<DateRange | undefined>();

  const [editEquipments, setEditEquipments] = useState<string[]>([]);

  const [editReservedEquipments, setEditReservedEquipments] = useState<string[]>([]);

  const [subjectName, setSubjectName] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");




  const fetchCalendar = async () => {
    try {
      const res = await fetch("http://localhost:4000/reservations/calendar");
      const data = await res.json();

      const approved = data.filter((r: any) => r.status === "APPROVED");

      const grouped: Record<string, CalendarReservation[]> = {};

      approved.forEach((r: CalendarReservation) => {
      
        const rawDate = new Date(r.startDate);
        const localDate = new Date(
          rawDate.getFullYear(),
          rawDate.getMonth(),
          rawDate.getDate()
        );

        const key = format(localDate, "yyyy-MM-dd"); 

        if (!grouped[key]) {
          grouped[key] = [];
        }

        grouped[key].push(r);
      });



      Object.values(grouped).forEach((list: any[]) => {
        list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
      });

      const list: FCEvent[] = Object.entries(grouped).map(
        ([date, reservations]) => {

         
          const d = new Date(date + "T00:00:00");

          const localStart = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          );

          return {
            id: date,
            title: `${reservations.length}건`,
            start: localStart,
            allDay: true,
            extendedProps: {
              reservations,
            },
          };
        }
      );


      setEvents(list);
    } catch (err) {
      console.error("캘린더 로딩 실패", err);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  useEffect(() => {
  if (!editRange?.from || !editRange?.to) return;

  const fetchConflicts = async () => {
    try {
  
      const startStr = format(editRange.from!, "yyyy-MM-dd");
      const endStr = format(editRange.to!, "yyyy-MM-dd");


      const res = await fetch(
        `http://localhost:4000/reservations/conflicts?start=${startStr}&end=${endStr}&excludeId=${clickedEvent?.id}`
      );

      const data = await res.json();

      setEditReservedEquipments(data.map((id: number) => String(id)));
    } catch (err) {
      console.error("충돌 조회 실패", err);
    }
  };

  fetchConflicts();
}, [editRange, clickedEvent?.id]);




  const renderEventContent = (arg: any) => {
    return (
      <div className="text-xs font-medium">
        {arg.event.title}
      </div>
    );
  };

  const normalizeDate = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };


  const handleDateClick = async (info: any) => {
    const clicked = new Date(info.dateStr);

    const day = clicked.getDay();
    if (day === 0 || day === 6) return;

    setSelectedDate(info.dateStr);
    setStartDate(clicked);

    const defaultEnd = new Date(clicked);
    defaultEnd.setDate(clicked.getDate() + 1);

    setEndDate(defaultEnd);


    try {
      const [userRes, equipRes, reservedRes] = await Promise.all([
        fetch("http://localhost:4000/users"),
        fetch("http://localhost:4000/equipments"),
        fetch(`http://localhost:4000/reservations/by-date?date=${info.dateStr}`)
      ]);

      const userData = await userRes.json();
      const equipData = await equipRes.json();
      const reservedData = await reservedRes.json();

      setUsers(userData);
      setEquipments(equipData);
      setReservedEquipments(reservedData);

      setOpenCreateModal(true);
    } catch (err) {
      console.error(err);
      toast({ title: "데이터 로딩 실패", variant: "destructive" });
    }
  };

  const handleDeleteReservation = async () => {
    if (!clickedEvent) return;

    try {
      await fetch(
        `http://localhost:4000/reservations/${clickedEvent.id}`,
        { method: "DELETE" }
      );

      toast({ title: "삭제 완료" });

      setOpenEventModal(false);
      await fetchCalendar();
    } catch (err) {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };


  const handleUpdateReservation = async () => {
    if (!clickedEvent || !editRange?.from || !editRange?.to) return;

    try {
      await fetch(
        `http://localhost:4000/reservations/${clickedEvent.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: normalizeDate(editRange.from),
            endDate: normalizeDate(editRange.to),
            equipmentIds: editEquipments.map(Number),
          }),
        }
      );

      toast({ title: "수정 완료" });

      setOpenEditModal(false);
      setOpenEventModal(false);
      await fetchCalendar();
    } catch (err) {
      toast({ title: "수정 실패", variant: "destructive" });
    }
  };




  const handleCreateReservation = async () => {
    if (
    !selectedUser ||
    selectedEquipments.length === 0 ||
    !startDate ||
    !endDate ||
    !subjectName.trim() ||
    !purpose.trim()
  ) {
    toast({ title: "모든 항목을 선택하세요", variant: "destructive" });
    return;
  }

  try {
    await fetch("http://localhost:4000/reservations/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: Number(selectedUser),
        equipmentIds: selectedEquipments.map(Number),
        startDate: normalizeDate(startDate),
        endDate: normalizeDate(endDate),
        subjectName,
        purpose, 
      }),
    });


    toast({ title: "예약 등록 완료" });
    setOpenCreateModal(false);

    await fetchCalendar();
  } catch (err) {
    toast({ title: "등록 실패", variant: "destructive" });
  }
  };


  // "하루 목록 모달"
  const handleEventClick = (info: any) => {
    const reservations = info.event.extendedProps.reservations as CalendarReservation[];
    setDayEvents(reservations);
    setOpenDayModal(true);
  };




  const groupedByUser = (dayEvents ?? []).reduce(
    (acc: Record<string, CalendarReservation[]>, cur) => {

      const userName = cur.user?.name ?? "알 수 없음";
      const from = format(new Date(cur.startDate), "yyyy-MM-dd");
      const to = format(new Date(cur.endDate), "yyyy-MM-dd");
      const subject = cur.subjectName ?? "";
      const purpose = cur.purpose ?? "";

      // 🔥 그룹 기준을 더 세분화
      const key = `${userName}_${from}_${to}_${subject}_${purpose}`;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(cur);
      return acc;
    },
    {}
  );




  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">장비 대여 캘린더</h1>
        <div className="flex gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
          </span>
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="local"
        events={events as EventInput[]}
        height="80vh"
        eventDisplay="block"
        eventContent={renderEventContent}


        dayCellClassNames={(arg) => {
          const day = arg.date.getDay();
          if (day === 0 || day === 6) {
            return [
              "bg-gray-100",
              "text-gray-400",
              "cursor-not-allowed",
            ];
          }
          return [];
        }}

        dateClick={(info) => {
          const day = new Date(info.dateStr).getDay();
          if (day === 0 || day === 6) return;
          handleDateClick(info);
        }}

        eventClick={handleEventClick}
  
      />

      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>관리자 수동 예약 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            {/* 대출 기간 */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">대출 시작일</p>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {startDate ? format(startDate, "yyyy/MM/dd") : "날짜 선택"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate ?? undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setStartDate(date);

                      const next = new Date(date);
                      next.setDate(date.getDate() + 1);
                      setEndDate(next);
                    }}
                  />
                </PopoverContent>
              </Popover>

              <p className="text-sm text-muted-foreground mt-4 mb-2">반납일</p>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {endDate ? format(endDate, "yyyy/MM/dd") : "날짜 선택"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate ?? undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setEndDate(date);
                    }}
                    disabled={(date) =>
                      startDate ? date < startDate : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>


            {/* 사용자 선택 */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">빌릴 사람</p>
              <select
                className="w-full border p-2 rounded"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">선택하세요</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* 교과목명 입력 */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">교과목명</p>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </div>

            {/* 사용 목적 */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">사용 목적</p>
              <textarea
                className="w-full border p-2 rounded resize-none"
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            <div className="border rounded p-3 h-40 overflow-y-auto space-y-2">
              {equipments.map((e) => {
                const isReserved = reservedEquipments.includes(e.id);
                const checked = selectedEquipments.includes(String(e.id));

                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-2 text-sm ${
                      isReserved ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={e.id}
                      disabled={isReserved}
                      checked={checked}
                      onChange={(ev) => {
                        if (ev.target.checked) {
                          setSelectedEquipments((prev) => [
                            ...prev,
                            String(e.id),
                          ]);
                        } else {
                          setSelectedEquipments((prev) =>
                            prev.filter((id) => id !== String(e.id))
                          );
                        }
                      }}
                    />
                    [{e.managementNumber}] {e.name || "이름 없음"}
                    {isReserved && " (이미 예약됨)"}
                  </label>
                );
              })}
            </div>


          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateModal(false)}>
              취소
            </Button>
            <Button onClick={handleCreateReservation}>
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* =======================
              날짜별 예약 리스트 모달
        ======================= */}
        <Dialog open={openDayModal} onOpenChange={setOpenDayModal}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>해당 날짜 대여 목록</DialogTitle>
              <DialogDescription>
                신청 순서대로 정렬된 목록입니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {Object.entries(groupedByUser).map(([key, reservations], idx) => (
                <div
                  key={key}
                  className="p-3 border rounded space-y-2 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => {
                    const r = reservations[0];

                    const event: FCEvent = {
                      id: String(r.id),
                      title: r.items
                        ?.map(item => item.equipment?.name ?? "이름 없음")
                        .join(", "),
                      start: r.startDate,
                      extendedProps: {
                        userName: r.user?.name,
                        studentId: r.user?.studentId,
                        subjectName: r.subjectName,
                        purpose: r.purpose,
                        rawFrom: new Date(r.startDate),
                        rawTo: new Date(r.endDate),
                        managementNumber: r.items
                          ?.map(item => item.equipment?.managementNumber)
                          .filter(Boolean)
                          .join(", "),
                        equipmentIds: r.items.map(item => String(item.equipment.id)),
                      },
                    };

                    setClickedEvent(event);
                    setOpenDayModal(false);
                    setOpenEventModal(true);
                  }}
                >
                  <p className="font-semibold">
                    {idx + 1}. {reservations[0].user.name}
                    {reservations[0].user.studentId && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({reservations[0].user.studentId})
                      </span>
                    )}
                  </p>

                  {/* 구분 포인트 보여주기 */}
                  <p className="text-xs text-muted-foreground ml-3">
                    {format(new Date(reservations[0].startDate), "yyyy/MM/dd")} ~{" "}
                    {format(new Date(reservations[0].endDate), "yyyy/MM/dd")}
                  </p>

                  {reservations.map((r) => (
                    <div
                      key={r.id}
                      className="text-sm text-muted-foreground ml-3"
                    >
                      - {r.items.map(i => i.equipment?.name).join(", ")}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setOpenDayModal(false)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>




      {/* =======================
            이벤트 클릭 모달 (단건)
        ======================= */}
        <Dialog open={openEventModal} onOpenChange={setOpenEventModal}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>대여 상세</DialogTitle>
              <DialogDescription>
                선택한 일정의 상세 정보입니다.
              </DialogDescription>
            </DialogHeader>

            {clickedEvent && (
              <div className="space-y-4">

                <div>
                  <p className="text-sm text-muted-foreground">사용자</p>
                  <p className="font-medium">
                    {clickedEvent.extendedProps?.userName ?? "알 수 없음"}
                    {clickedEvent.extendedProps?.studentId && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({clickedEvent.extendedProps.studentId})
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">대출 기간</p>
                  <p className="font-medium">
                    {clickedEvent.extendedProps?.rawFrom &&
                      format(clickedEvent.extendedProps.rawFrom, "yyyy/MM/dd")}{" "}
                    ~{" "}
                    {clickedEvent.extendedProps?.rawTo &&
                      format(clickedEvent.extendedProps.rawTo, "yyyy/MM/dd")}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">교과목</p>
                  <p className="font-medium">
                    {clickedEvent.extendedProps?.subjectName ?? "없음"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">사용 목적</p>
                  <p className="font-medium">
                    {clickedEvent.extendedProps?.purpose ?? "없음"}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-muted-foreground">장비</p>
                  <p className="font-medium">
                    
                    {clickedEvent.title}
                  </p>

                  {clickedEvent.extendedProps?.managementNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      관리번호: {clickedEvent.extendedProps.managementNumber}
                    </p>
                  )}
                </div>

              </div>
            )}

            <DialogFooter className="flex justify-between">

              <Button
                variant="secondary"
                onClick={async () => {
                  if (!clickedEvent) return;

                // 🔥 장비 목록 먼저 불러오기
                const res = await fetch("http://localhost:4000/equipments");
                const data = await res.json();
                setEquipments(data);

                  setEditRange({
                    from: clickedEvent.extendedProps?.rawFrom ?? undefined,
                    to: clickedEvent.extendedProps?.rawTo ?? undefined,
                  });

                  setEditEquipments(
                    clickedEvent.extendedProps?.equipmentIds ?? []
                  );


                  setOpenEditModal(true);
                }}

              >
                수정
              </Button>

              <Button
                variant="destructive"
                onClick={handleDeleteReservation}
              >
                삭제
              </Button>


              <Button onClick={() => setOpenEventModal(false)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            
            {/* <Calendar
              mode="single"
              selected={editStartDate ?? undefined}
              onSelect={(date) => setEditStartDate(date ?? null)}
            />

            <Calendar
              mode="single"
              selected={editEndDate ?? undefined}
              onSelect={(date) => setEditEndDate(date ?? null)}
            /> */}

            <Calendar
              mode="range"
              selected={editRange}
              onSelect={(range) => setEditRange(range)}
            />

            <div className="border rounded p-3 h-40 overflow-y-auto space-y-2">
              {equipments.map((e) => {
                const checked = editEquipments.includes(String(e.id));
                const isReserved = editReservedEquipments.includes(String(e.id));

                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-2 text-sm ${
                      isReserved ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={e.id}
                      checked={checked}
                      disabled={isReserved}
                      onChange={(ev) => {
                        if (ev.target.checked) {
                          setEditEquipments((prev) => [...prev, String(e.id)]);
                        } else {
                          setEditEquipments((prev) =>
                            prev.filter((id) => id !== String(e.id))
                          );
                        }
                      }}
                    />
                    [{e.managementNumber}] {e.name}
                    {isReserved && " (이미 예약됨)"}
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditModal(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateReservation}>
              수정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
   ); 
}
