// 나의 대여 현황
'use client';

import { useEffect, useState, useCallback } from "react"; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import Image from "next/image";
import { Film, Calendar, Clock, Info } from 'lucide-react';
import { Mic, Building } from "lucide-react";
import { Button } from "@/components/ui/button";


// ===== 상태 타입 =====
export type RentalStatus =
  | "REQUESTED"
  | "APPROVED"
  | "RENTED"
  | "RETURNED"
  | "REJECTED";

export type FacilityStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = {
  REQUESTED: "승인 대기",
  APPROVED: "승인",
  RENTED: "대출 중",
  RETURNED: "반납 완료",
  REJECTED: "거절",
};

const FACILITY_STATUS_LABEL: Record<FacilityStatus, string> = {
  REQUESTED: "승인 대기",
  APPROVED: "승인",
  REJECTED: "거절",
  COMPLETED: "사용 완료",
};


// ===== 타입 ===== // 
type RentalItem = {
  id: string;
  equipment: {
    id: number;
    name: string;
    managementNumber: string;
  };
};

type RentalRecord = {
  id: string;
  items: RentalItem[];
  createdAt?: Date | null; 
  approvedAt?: Date | null; 
  shootingDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  rentalPeriod?: string;
  pickupTime?: string | null;
  relatedClass?: string | null;
  status: RentalStatus; 
  // 추가: 어떤 테이블에서 왔는지(Reservation/RejectedRequest)
  // source?: "RESERVATION" | "REJECTED_REQUEST";
  source?: "RESERVATION" | "REQUEST";


  // ✅ 추가: 거절 사유 표시용
  rejectReason?: string | null;
};

type FacilityReservation = {
  id: string;
  facility: string;
  createdAt?: Date | null;
  date?: Date | null;             // 단일 날짜 예약 스키마
  startTime?: string | null;
  endTime?: string | null;
  purpose?: string | null;
//   status: string;
  status: FacilityStatus;
  start?: Date | null;            // 기간형(타임스탬프)
  end?: Date | null;
  team?: { name: string; studentId: string }[]; 
  requesterUid?: string;
  rejectReason?: string | null;
};

function fmtCompactDate(d?: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}


function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}


function fmtDate(d?: Date | null, fallback = "-"): string {
  if (!d) return fallback;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiffInclusive(a?: Date | null, b?: Date | null): number | null {
  if (!a || !b) return null;
  const a0 = new Date(a); a0.setHours(0,0,0,0); // 원본 객체 변형 방지
  const b0 = new Date(b); b0.setHours(0,0,0,0); 
  const ms = b0.getTime() - a0.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1); // 포함 구간
}


// ★ 한국식 날짜 표기 (월 일)
function fmtKDate(d?: Date | null): string {
  if (!d) return "-";
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
}

// ★ 범위 표기: "M월 D일 ~ M월 D일"
//   - 같은 날이면 하나만
//   - 연도가 다르면 연도도 표기
function fmtKRange(a?: Date | null, b?: Date | null): string {
  if (a && b) {
    if (a.getTime() === b.getTime()) {
      return fmtKDate(a); // 같은 날이면 하나만
    }
    const sameYear = a.getFullYear() === b.getFullYear();
    const toStr = (d: Date) =>
      sameYear ? fmtKDate(d) : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    return `${toStr(a)} ~ ${toStr(b)}`;
  }
  if (a) return fmtKDate(a);
  if (b) return fmtKDate(b);
  return "-";
}

// ★ 추가: 여러 키 중 첫 번째 유효한 날짜를 선택
function pickDate(d: any, ...keys: string[]): Date | null {
  for (const k of keys) {
    const t = toDate(d?.[k]);
    if (t) return t;
  }
  return null;
}



// ★ 유지: 기간 라벨 계산(일수/시간용) — 현재 UI는 fmtKRange로 표시하지만, 데이터에도 보관
function computePeriodLabel(d: any): string {
  // 1) 문자열로 저장된 기간이 있으면 우선 사용 (빈 문자열 방지)
  if (typeof d?.rentalPeriod === "string" && d.rentalPeriod.trim()) {
    return d.rentalPeriod.trim();
  }

  // 2) 다양한 키 지원: 요청기간/실제대여기간 모두 커버
  const start = pickDate(d, "startDate", "start", "startAt", "requestedFrom", "rentedAt");
  const end   = pickDate(d, "endDate",   "end",   "endAt",   "requestedTo",   "returnedAt");

  if (start && end) {
    const days = dayDiffInclusive(start, end);
    if (days && days >= 1) return `${days}일`;

    // (동일일 혹은 시간 단위라면 시간으로 표기)
    const ms = end.getTime() - start.getTime();
    if (Number.isFinite(ms)) {
      const hours = Math.max(1, Math.round(ms / (1000 * 60 * 60)));
      return `${hours}시간`;
    }
  }

  // 3) 백엔드가 시간 수를 따로 저장하는 경우
  if (Number.isFinite(Number(d?.requestedHours)) && Number(d.requestedHours) > 0) {
    return `${Math.round(Number(d.requestedHours))}시간`;
  }

  return "-";
}

const SHOW_FACILITY_STATUS = true;

const getStatusVariant = (
  status: RentalStatus | FacilityStatus
): 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case "RENTED":
    case "APPROVED":
      return "default";
    case "REQUESTED":
      return "secondary";
    default:
      return "outline";
  }
};


export default function MyStatusPage() {

  const [rented, setRented] = useState<RentalRecord[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const dateCounter: Record<string, number> = {};
  const getFacilityIcon = (name: string) => {
  if (name.includes("녹음")) return <Mic className="w-5 h-5 text-muted-foreground mt-0.5" />;
  if (name.includes("편집")) return <Film className="w-5 h-5 text-muted-foreground mt-0.5" />;
  return <Building className="w-5 h-5 text-muted-foreground mt-0.5" />;
};

  useEffect(() => {
    const markAsRead = async () => {
      await fetch("https://rentcore-backend.onrender.com/my/notifications/read", {
        method: "PATCH",
        headers: {
          credentials: "include",
        },
      });

      // 이거 추가
      window.dispatchEvent(new Event("notificationsUpdated"));
    };

    markAsRead();
  }, []);

  const handleDownload = async (reservationId: string) => {
    try {
      // res-3 → 3 추출
      const realId = reservationId.split("-")[1];
      const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

      const res = await fetch(
        `${API_BASE}/reservations/${realId}/print`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("PDF 다운로드 실패");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `기자재대여신청서_${realId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("신청서 다운로드에 실패했습니다.");
    }
  };

  const handleFacilityDownload = async (reservationId: string) => {
    try {

      const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
      const res = await fetch(
        `${API_BASE}/facility-reservations/${reservationId}/print`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("PDF 다운로드 실패");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `시설신청서_${reservationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("시설 신청서 다운로드 실패");
    }
  };



  // 추가: fetch 함수 분리
  const fetchMyStatus = useCallback(async () => {
    try {
      const res = await fetch("https://rentcore-backend.onrender.com/my/status", {
        credentials: "include",
        cache: "no-store", 
      });

      if (!res.ok) throw new Error("내 대여 현황 조회 실패");

      const data = await res.json();


      // 서버 응답 안전하게 받기
      const reservations = Array.isArray(data.reservations) ? data.reservations : [];
      const rentalRequests = Array.isArray(data.rentalRequests) ? data.rentalRequests : [];
      const facilities = Array.isArray(data.facilities) ? data.facilities : [];

      /** 1) Reservation(확정된 예약/대여) -> RentalRecord */
      const reservationList: RentalRecord[] = reservations.map((r: any) => {
        
        return {
        id: `res-${r.id}`,
        source: "RESERVATION",
        items: (r.items ?? []).map((it: any) => ({
          id: String(it.id),
          equipment: {
            id: it.equipment?.id,
            name: it.equipment?.name ?? "이름 없음",
            managementNumber: it.equipment?.managementNumber ?? "-",
          },
        })),
        createdAt: r.rentalRequest?.createdAt
          ? new Date(r.rentalRequest.createdAt)
          : (r.createdAt ? new Date(r.createdAt) : null),

        startDate: r.startDate ? new Date(r.startDate) : null,
        endDate: r.endDate ? new Date(r.endDate) : null,
        relatedClass: r.subjectName ?? null,

        startTime: r.startTime ?? null,
        endTime: r.endTime ?? null,
        status:
          r.status === "PENDING" ? "REQUESTED" :
          r.status === "APPROVED" ? "APPROVED" :
          r.status === "REJECTED" ? "REJECTED" :
          "REQUESTED",

        rejectReason: r.rejectReason ?? null,
      };
    });

      /** 2) RentalRequest(사용자 신청 이력: REQUESTED 포함) -> RentalRecord */
      const requestList: RentalRecord[] = rentalRequests
        .filter((r: any) => r.status !== "APPROVED") 
        .map((r: any) => ({
        id: `req-${r.id}`,
        source: "REQUEST",

        items: (r.items ?? []).map((it: any) => ({
          id: String(it.id),
          equipment: {
            id: it.equipment?.id,
            name: it.equipment?.name ?? "이름 없음",
            managementNumber: it.equipment?.managementNumber ?? "-",
          },
        })),
        createdAt: r.createdAt ? new Date(r.createdAt) : null,

        // RentalRequest는 from/to
        startDate: r.from ? new Date(r.from) : null,
        endDate: r.to ? new Date(r.to) : null,

        relatedClass: r.subjectName ?? null,

        // 여기서 “승인 대기/거절/승인”이 정확히 반영됨
        status: (r.status as RentalStatus) ?? "REQUESTED",

        rejectReason: r.rejectionReason ?? null,
      }));

      /** 3) 둘 합치기 + 정렬 */
      const merged = [...requestList, ...reservationList].sort((a, b) => {
        const at = a.createdAt ? a.createdAt.getTime() : 0;
        const bt = b.createdAt ? b.createdAt.getTime() : 0;
        return bt - at;
      });

      // 날짜별 그룹 만들기
        const groupedByDate: Record<string, RentalRecord[]> = {};

        merged.forEach((item) => {
          const key = fmtCompactDate(item.createdAt);
          if (!groupedByDate[key]) groupedByDate[key] = [];
          groupedByDate[key].push(item);
        });

        // 같은 날짜 안에서는 오래된 순(오름차순)으로 정렬 후 번호 부여
        Object.values(groupedByDate).forEach((list) => {
          list
            .sort((a, b) => {
              const at = a.createdAt ? a.createdAt.getTime() : 0;
              const bt = b.createdAt ? b.createdAt.getTime() : 0;
              return at - bt; // 👈 오래된 게 먼저
            })
            .forEach((item, idx) => {
              (item as any).requestNumber = idx + 1;
            });
        });

      setRented(merged);

      // 1️먼저 매핑
      const facilityList: FacilityReservation[] = facilities.map((f: any) => ({
        id: String(f.id),
        facility: f.facility?.name ?? f.facility ?? "시설",
        createdAt: f.createdAt ? new Date(f.createdAt) : null,
        date: f.date ? new Date(f.date) : null,
        startTime: f.startTime ?? null,
        endTime: f.endTime ?? null,
        start: f.startAt ? new Date(f.startAt) : (f.start ? new Date(f.start) : null),
        end: f.endAt ? new Date(f.endAt) : (f.end ? new Date(f.end) : null),
        purpose: f.purpose ?? null,
        status: (String(f.status).toUpperCase() as FacilityStatus) ?? "REQUESTED",
        team: f.team ?? [],
        rejectReason: f.rejectReason ?? f.rejectionReason ?? null,
      }));

      // 2 날짜별 그룹핑
      const groupedFacility: Record<string, FacilityReservation[]> = {};

      facilityList.forEach((item) => {
        const key = fmtCompactDate(item.createdAt);
        if (!groupedFacility[key]) groupedFacility[key] = [];
        groupedFacility[key].push(item);
      });

      // 3 같은 날짜 안에서 오래된 순으로 정렬 + 번호 부여
      Object.values(groupedFacility).forEach((list) => {
        list
          .sort((a, b) => {
            const at = a.createdAt ? a.createdAt.getTime() : 0;
            const bt = b.createdAt ? b.createdAt.getTime() : 0;
            return at - bt;
          })
          .forEach((item, idx) => {
            (item as any).requestNumber = idx + 1;
          });
      });

      // 4 최종 세팅
      setReservations(
        facilityList.sort((a, b) => {
          const at = a.createdAt ? a.createdAt.getTime() : 0;
          const bt = b.createdAt ? b.createdAt.getTime() : 0;
          return bt - at;
        })
      );

    } catch (e) {
      console.error(e);
      setRented([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 5초마다 자동 갱신
  useEffect(() => {
    fetchMyStatus();

    const interval = setInterval(fetchMyStatus, 5000);

    return () => clearInterval(interval);
  }, [fetchMyStatus]);

  // 탭 돌아오면 즉시 갱신
  useEffect(() => {
    const handleFocus = () => fetchMyStatus();

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchMyStatus]);


  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">나의 대여 현황</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Film className="w-6 h-6" />
              대여 장비 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-10">불러오는 중…</p>
            ) : rented.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {rented.map((rental, index) => (
                  <AccordionItem key={rental.id} value={`item-${index}`}>
                    <AccordionTrigger>
                      <div className="flex flex-col w-full pr-4 text-left gap-1">
                        <p className="text-lg font-bold">
                          신청번호 #{fmtCompactDate(rental.createdAt)}-
                          {(rental as any).requestNumber}
                        </p>

                        <Badge variant={getStatusVariant(rental.status)}>
                          {RENTAL_STATUS_LABEL[rental.status]}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                      
                        {rental.items.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold">
                                관리번호 : {item.equipment.managementNumber}
                              </p>

                              <p className="text-sm text-muted-foreground">
                                {item.equipment.name}
                              </p>
                            </div>
                            
                            {idx === 0 &&
                              rental.source === "RESERVATION" &&
                              rental.status !== "REJECTED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownload(rental.id)}
                                >
                                  신청서 다운로드
                                </Button>
                            )
                              }
                          </div>
                        ))}

                        <Separator />

                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <strong>대여기간:</strong>{" "}
                            {rental.startDate && rental.endDate
                              ? `${fmtKDate(rental.startDate)} ${rental.startDate.toTimeString().slice(0,5)} 
                                ~ ${fmtKDate(rental.endDate)} ${rental.endDate.toTimeString().slice(0,5)}`
                              : "-"}
                          </div>
                        </div>

                        {rental.status === "REJECTED" && rental.rejectReason && (
                          <p className="text-sm text-red-500">
                            거절 사유: {rental.rejectReason}
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-muted-foreground text-center py-10">대여 중인 장비가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* Facility Reservation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              시설 예약 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-10">불러오는 중…</p>
            ) : reservations.length > 0 ? (

              <Accordion type="single" collapsible className="w-full">
                  {reservations.map((reservation, index) => (
                    <AccordionItem key={reservation.id} value={`fac-${index}`}>

                      <AccordionTrigger>
                        <div className="flex flex-col w-full pr-4 text-left gap-1">
                          <p className="text-lg font-bold">
                            신청번호 #{fmtCompactDate(reservation.createdAt)}-
                            {(reservation as any).requestNumber}
                          </p>

                          <Badge variant={getStatusVariant(reservation.status)}>
                            {FACILITY_STATUS_LABEL[reservation.status]}
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent>
                        <div className="space-y-4 pt-2 text-sm">
                      
                         {/* <div className="flex items-start"> */}
                         <div className="flex items-center gap-2">
                          <div className="w-6 flex justify-center -ml-1">
                            {getFacilityIcon(reservation.facility)}
                          </div>
                          <div>
                            <strong>시설:</strong>{" "}
                            {reservation.facility}

                          </div>

                          {reservation.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-auto"
                              onClick={() => handleFacilityDownload(reservation.id)}
                            >
                              신청서 다운로드
                            </Button>
                          )}
                        </div>

                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                                <strong>사용 기간:</strong>
                                {/* 날짜 */}
                                {reservation.date
                                  ? fmtDate(reservation.date)
                                  : reservation.start
                                  ? fmtKRange(reservation.start)
                                  : "-"}

                                {" -- "}

                                {/* 시간 */}
                                {reservation.startTime && reservation.endTime
                                  ? `${reservation.startTime} ~ ${reservation.endTime}`
                                  : reservation.start && reservation.end
                                  ? `${reservation.start.toTimeString().slice(0,5)} ~ ${reservation.end.toTimeString().slice(0,5)}`
                                  : ""}
                            </div>
                          </div>

                          {/* 거절 사유 표시 */}
                          {reservation.status === "REJECTED" && reservation.rejectReason && (
                            <p className="text-sm text-red-500">
                              거절 사유: {reservation.rejectReason}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
            ) : (
              <p className="text-muted-foreground text-center py-10">예약된 시설이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
