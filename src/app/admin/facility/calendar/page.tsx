"use client";

import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/simple-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type FCEvent = {
  id: string;
  title: string;
  start: Date | string;
  allDay?: boolean;
  extendedProps?: {
    reservations: any[];
  };
};

type TeamMember = {
  name: string;
  studentId: string;
  department: string;
};

export default function FacilityCalendarPage() {
  const { toast } = useToast();
  const { profile, loading } = useCurrentUser();

  const [events, setEvents] = useState<FCEvent[]>([]);
  const [openDayModal, setOpenDayModal] = useState(false);
  const [dayReservations, setDayReservations] = useState<any[]>([]);

  const [openEventModal, setOpenEventModal] = useState(false);
  const [clickedReservation, setClickedReservation] = useState<any>(null);

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  const [subjectName, setSubjectName] = useState("");
  const [purpose, setPurpose] = useState("");
  

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberStudentId, setMemberStudentId] = useState("");
  const [memberDepartment, setMemberDepartment] = useState("");


  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${String(hour).padStart(2, "0")}:${minute}`;
  });

  const handleCreateReservation = async () => {
    if (!selectedUser || !selectedFacility || !startDate || !endDate) {
      toast({ title: "모든 항목을 입력하세요", variant: "destructive" });
      return;
    }

    if (!selectedDate) return;

    const baseDate = format(selectedDate, "yyyy-MM-dd");

    const start = new Date(`${baseDate}T${startTime}`);
    const end = new Date(`${baseDate}T${endTime}`);

    try {
      await fetch("/api/facility-reservations/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(selectedUser),
          facilityId: Number(selectedFacility),
          startAt: start,
          endAt: end,
          subjectName,
          purpose,
          team,
        }),
      });

      toast({ title: "예약 등록 완료" });
      setOpenCreateModal(false);
      fetchCalendar();
    } catch {
      toast({ title: "등록 실패", variant: "destructive" });
    }
  };


  const handleUpdateReservation = async () => {
    if (!clickedReservation) return;

    if (!selectedDate) return;

    const baseDate = format(selectedDate, "yyyy-MM-dd");

    const start = new Date(`${baseDate}T${startTime}`);
    const end = new Date(`${baseDate}T${endTime}`);

    await fetch(`/api/facility-reservations/${clickedReservation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: start,
        endAt: end,
        facilityId: Number(selectedFacility),
      }),
    });

    toast({ title: "수정 완료" });

    setOpenEditModal(false);
    setOpenEventModal(false);
    fetchCalendar();
  };

  /* ==============================
     날짜별 그룹 구조로 변경
  ============================== */

  const fetchCalendar = async () => {
    try {
      const res = await fetch("/api/facility-reservations", {
        credentials: "include",
      });

      const data = await res.json();

      const approved = data.filter(
        (r: any) => r.status === "APPROVED" || r.status === "REQUESTED"
      );

      const grouped: Record<string, any[]> = {};

      approved.forEach((r: any) => {
        const key = format(new Date(r.startAt), "yyyy-MM-dd");

        if (!grouped[key]) {
          grouped[key] = [];
        }

        grouped[key].push(r);
      });

      const list: FCEvent[] = Object.entries(grouped).map(
        ([date, reservations]) => ({
          id: date,
          title: `${reservations.length}건`,
          start: date,    
          allDay: true,
          extendedProps: { reservations },
        })
      );

      setEvents(list);
    } catch (err) {
      console.error("시설 캘린더 로딩 실패", err);
    }
  };

  useEffect(() => {
    if (!loading && profile?.role === "ADMIN") {
      fetchCalendar();
    }
  }, [loading, profile]);

  useEffect(() => {
    const loadBaseData = async () => {
      const [userRes, facilityRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/facilities"),
      ]);

      setUsers(await userRes.json());
      setFacilities(await facilityRes.json());
    };

    loadBaseData();
  }, []);

  

  if (loading) return null;

  if (!profile || profile.role !== "ADMIN") {
    return <div className="p-6">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="px-6 pt-2 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">시설 예약 캘린더</h1>
      </div>

      {/* ==============================
          FullCalendar 단순화
      ============================== */}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]} 
        initialView="dayGridMonth"
        locale="ko"
        headerToolbar={{
          left: "",
          center: "title",
          right: "today prev,next",
        }}
        buttonText={{
          today: "오늘",
        }}
        events={events as EventInput[]}
        height="auto"
        expandRows={true}
        eventDisplay="block"
        eventBackgroundColor="transparent"
        eventBorderColor="transparent"
        dayCellContent={(arg) => arg.date.getDate()}

        eventContent={(arg) => (
          <div className="flex justify-center items-center">
            <span
              className="
                px-3 py-1
                text-xs font-semibold
                rounded-full
                bg-black
                text-white
              "
            >
              {arg.event.title}
            </span>
          </div>
        )}

        dateClick={(info) => {
          const clicked = new Date(info.dateStr);

          setSelectedDate(clicked);
          setStartDate(clicked);

          const next = new Date(clicked);
          next.setDate(clicked.getDate() + 1);
          setEndDate(next);

          setOpenCreateModal(true);
        }}

        eventClick={(info) => {
          const reservations =
            info.event.extendedProps?.reservations ?? [];

          setDayReservations(reservations);
          setOpenDayModal(true);
        }}
      />

      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>관리자 수동 예약 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto overflow-x-hidden pr-2 flex-1">
            {/* 사용자 선택 */}
            <select
              className="w-full border p-2 rounded"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">사용자 선택</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            {/* 시설 선택 */}
            <select
              className="w-full border p-2 rounded"
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
            >
              <option value="">시설 선택</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* 날짜 선택 */}
            <Popover>
               <p className="text-sm text-muted-foreground mb-2">날짜 선택</p>
              <PopoverTrigger asChild>
                
                <button className="w-full border p-2 rounded text-left">
                  {selectedDate
                    ? format(selectedDate, "yyyy-MM-dd")
                    : "예약 날짜 선택"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(date) => setSelectedDate(date ?? null)}
                />
              </PopoverContent>
            </Popover>



            {/* 시작 시간 */}
            <select
              className="w-full border p-2 rounded"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>

            {/* 종료 시간 */}
            <select
              className="w-full border p-2 rounded"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>

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

            {/* 팀원 추가 */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">팀원 추가</p>

              <div className="grid grid-cols-[1fr_1fr_1fr_60px] gap-2">
                <input
                  type="text"
                  placeholder="학과"
                  className="w-full border p-2 rounded"
                  value={memberDepartment}
                  onChange={(e) => setMemberDepartment(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="학번"
                  className="w-full border p-2 rounded"
                  value={memberStudentId}
                  onChange={(e) => setMemberStudentId(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="이름"
                  className="w-full border p-2 rounded"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!memberName || !memberStudentId || !memberDepartment) return;

                    setTeam([
                      ...team,
                      {
                        name: memberName,
                        studentId: memberStudentId,
                        department: memberDepartment,
                      },
                    ]);

                    setMemberName("");
                    setMemberStudentId("");
                    setMemberDepartment("");
                  }}
                >
                  추가
                </Button>
              </div>

              {/* 팀원 리스트 */}
              {team.length > 0 && (
                <div className="mt-3 space-y-1">
                  {team.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm border rounded p-2"
                    >
                      {m.name}
                      <span className="text-muted-foreground ml-1">
                        ({m.studentId} · {m.department})
                      </span>

                      <button
                        type="button"
                        className="text-red-500 text-xs"
                        onClick={() =>
                          setTeam(team.filter((_, i) => i !== idx))
                        }
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

      {/* ==============================
          날짜별 예약 목록 모달
      ============================== */}

      <Dialog open={openDayModal} onOpenChange={setOpenDayModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>해당 날짜 예약 목록</DialogTitle>
            {/* <DialogDescription>
              신청 순서대로 표시됩니다.
            </DialogDescription> */}
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {dayReservations.map((r, idx) => (
              <div
                key={r.id}
                className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setClickedReservation(r);
                  setOpenDayModal(false);
                  setOpenEventModal(true);
                }}
              >
                <p className="font-semibold">
                  {idx + 1}. {r.user?.name}
                  {r.user?.studentId && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({r.user.studentId})
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.facility?.name}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setOpenDayModal(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==============================
          상세 모달
      ============================== */}

      <Dialog open={openEventModal} onOpenChange={setOpenEventModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>예약 상세</DialogTitle>
            <DialogDescription>
              선택한 일정의 상세 정보입니다.
            </DialogDescription>
          </DialogHeader>

          {clickedReservation && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">신청자</p>
                <p className="font-medium">
                  {clickedReservation.user?.name}
                  {clickedReservation.user?.studentId && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({clickedReservation.user.studentId})
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">시설</p>
                <p className="font-medium">
                  {clickedReservation.facility?.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">기간</p>
                <p className="font-medium">
                  {format(
                    new Date(clickedReservation.startAt),
                    "yyyy/MM/dd HH:mm"
                  )}{" "}
                  ~{" "}
                  {format(
                    new Date(clickedReservation.endAt),
                    "yyyy/MM/dd HH:mm"
                  )}
                </p>
              </div>

              {clickedReservation.subjectName && (
                <div>
                  <p className="text-sm text-muted-foreground">교과목명</p>
                  <p className="font-medium">
                    {clickedReservation.subjectName}
                  </p>
                </div>
              )}

              {clickedReservation.purpose && (
                <div>
                  <p className="text-sm text-muted-foreground">목적</p>
                  <p>{clickedReservation.purpose}</p>
                </div>
              )}

              {clickedReservation.team &&
                clickedReservation.team.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">팀원</p>
                    <div className="mt-2 space-y-1">
                      {clickedReservation.team.map((member: any, idx: number) => (
                        <p key={idx} className="text-sm">
                          • {member.name}
                          <span className="text-muted-foreground ml-1">
                            ({member.studentId} · {member.department})
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedDate(new Date(clickedReservation.startAt));

                const start = new Date(clickedReservation.startAt);
                const end = new Date(clickedReservation.endAt);

                setStartTime(format(start, "HH:mm"));
                setEndTime(format(end, "HH:mm"));

                // setSelectedFacility(clickedReservation.facility?.id);
                setSelectedFacility(String(clickedReservation.facility?.id ?? ""));
                setOpenEditModal(true);
              }}
            >
              수정
            </Button>

            <Button
              variant="destructive"
              onClick={() => setOpenDeleteConfirm(true)}
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
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>예약 수정</DialogTitle>
          </DialogHeader>

          <select
            className="w-full border p-2 rounded"
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
          >
            <option value="">시설 선택</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full border p-2 rounded text-left">
                {selectedDate
                  ? format(selectedDate, "yyyy-MM-dd")
                  : "예약 날짜 선택"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Calendar
                mode="single"
                selected={selectedDate ?? undefined}
                onSelect={(date) => setSelectedDate(date ?? null)}
              />
            </PopoverContent>
          </Popover>

          <select
            className="w-full border p-2 rounded"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>

          <select
            className="w-full border p-2 rounded"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>

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

      {/* ==============================
         삭제 확인 모달
      ============================== */}

      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 삭제</DialogTitle>
            <DialogDescription>
              정말 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDeleteConfirm(false)}
            >
              취소
            </Button>

            <Button
              variant="destructive"
              onClick={async () => {
                if (!clickedReservation) return;

                await fetch(
                  `/api/facility-reservations/${clickedReservation.id}`,
                  { method: "DELETE" }
                );

                toast({ title: "삭제 완료" });

                setOpenDeleteConfirm(false);
                setOpenEventModal(false);
                fetchCalendar();
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}