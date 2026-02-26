"use client";

import { useState, useEffect } from "react";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// 거절 사유 입력 모달용
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { format } from "date-fns";
import { usePendingRequest } from "@/contexts/PendingRequestContext";


type RequestStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED";

type RequestType = "RENTAL" | "FACILITY";

type TypeFilter = "ALL" | RequestType;

interface BaseRequest {
  id: number;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  rejectionReason?: string;
  user: {
    name: string;
    email: string;
    studentId?: string;
  };
}

/** 장비 대여 요청 */
interface RentalRequestItem {
  equipment: { name: string; managementNumber: string };
}

interface RentalRequest extends BaseRequest {
  type: "RENTAL";
  items: RentalRequestItem[];
  startDateTime: string;
  endDateTime: string;
  // from?: string; to?: string; // (있으면 표시용으로 넣어도 됨)
}

/** 시설 예약 요청 (예시: 네 DB에 맞게 필드명 조정) */
interface FacilityRequest extends BaseRequest {
  type: "FACILITY";
  facility: {
    name: string;
  };
  startDateTime: string; // 예: "2026-02-22T10:00:00Z"
  endDateTime: string;
}

type AdminRequest = RentalRequest | FacilityRequest;

const statusMap: Record<
  RequestStatus,
  { text: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  REQUESTED: { text: "승인 대기", variant: "secondary" },
  APPROVED: { text: "승인 완료", variant: "default" },
  REJECTED: { text: "거절됨", variant: "destructive" },
};


export default function AdminRequestsPage() {
  // const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestStatus>("REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminClaim, setIsAdminClaim] = useState<boolean | null>(null);
  const { setPendingCount } = usePendingRequest();
  // const [viewRejectTarget, setViewRejectTarget] = useState<RentalRequest | null>(null);
  const [viewRejectTarget, setViewRejectTarget] = useState<AdminRequest | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [requests, setRequests] = useState<AdminRequest[]>([]);



  // 거절 사유 모달 상태
  const [rejectTarget, setRejectTarget] = useState<AdminRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");


  const fetchRequests = async (status: RequestStatus, type: TypeFilter) => {
    try {
      setLoading(true);
      setError(null);

      const q = new URLSearchParams();
      q.set("status", status);
      if (type !== "ALL") q.set("type", type);

      const res = await fetch(
        `/api/admin/requests?${q.toString()}`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("요청 목록 조회 실패");

      const data = await res.json();
      setRequests(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(activeTab, typeFilter);
  }, [activeTab, typeFilter]);



  const approveRequest = async (req: AdminRequest) => {
    const url =
      req.type === "RENTAL"
        ? `/api/rental-requests/${req.id}/approve`
        : `/api/facility-reservations/${req.id}/approve`; 

    await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "APPROVED" }),
    });

    setPendingCount(prev => Math.max(prev - 1, 0));
    await fetchRequests(activeTab, typeFilter);
  };

  const rejectRequestWithReason = async (req: AdminRequest, reason: string) => {
    const url =
      req.type === "RENTAL"
        ? `/api/rental-requests/${req.id}/reject`
        : `/api/facility-reservations/${req.id}/reject`; 

    await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "REJECTED", reason }),
    });

    setPendingCount(prev => Math.max(prev - 1, 0));
    await fetchRequests(activeTab, typeFilter);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">대여 요청 관리</h1>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestStatus)}>

      <div className="flex items-center gap-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestStatus)}>
          <TabsList>
            <TabsTrigger value="REQUESTED">승인 대기</TabsTrigger>
            <TabsTrigger value="APPROVED">승인 완료</TabsTrigger>
            <TabsTrigger value="REJECTED">거절됨</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <TabsList>
            <TabsTrigger value="ALL">전체</TabsTrigger>
            <TabsTrigger value="RENTAL">장비</TabsTrigger>
            <TabsTrigger value="FACILITY">시설</TabsTrigger>
          </TabsList>
        </Tabs>
        </div>

        <TabsContent value={activeTab}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신청일</TableHead>
                <TableHead>신청자</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>항목</TableHead>
                <TableHead className="text-right">처리</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {requests.map((req) => {
                // console.log("type:", req.type);

                if (req.type === "FACILITY") {
                  // console.log("start:", req.startDateTime);
                  // console.log("end:", req.endDateTime);
                }

                return (
                <TableRow
                  key={req.id}
                  className={req.status === "REJECTED" ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => {
                    if (req.status === "REJECTED") {
                      setViewRejectTarget(req);
                    }
                  }}
                >
                  <TableCell>
                    {req.createdAt
                        ? format(new Date(req.createdAt), "yyyy-MM-dd HH:mm")
                        : "-"}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{req.user?.name}</div>
                    {req.user?.studentId && (
                      <div className="text-xs text-muted-foreground">
                        {req.user.studentId}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {(() => {
                      const statusInfo = statusMap[req.status] ?? {
                        text: req.status,
                        variant: "outline"
                      };

                      return (
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.text}
                        </Badge>
                      );
                    })()}
                  </TableCell>

                  <TableCell>
                    <Badge variant={req.type === "RENTAL" ? "secondary" : "outline"}>
                      {req.type === "RENTAL" ? "장비" : "시설"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {req.type === "RENTAL" ? (
                      <div className="space-y-1">
                        {req.items?.map((item, idx) => {
                          const eq = item.equipment;
                          if (!eq) return <div key={idx}>삭제된 장비</div>;

                        const hasNumber = !!eq.managementNumber;
                        const hasName = !!eq.name;

                        if (hasNumber && hasName)
                          return <div key={idx} className="font-medium">
                            {eq.managementNumber} ({eq.name})
                          </div>;

                        if (hasNumber)
                          return <div key={idx} className="font-medium">{eq.managementNumber}</div>;

                        if (hasName)
                          return <div key={idx} className="font-medium">{eq.name}</div>;

                        return <div key={idx}>장비 정보 없음</div>;

                      })}

                      {/* 대여 기간 표시 */}
                        {"startDateTime" in req && req.startDateTime && (
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(req.startDateTime), "yyyy-MM-dd")}
                            {format(new Date(req.startDateTime), "yyyy-MM-dd") !==
                              format(new Date(req.endDateTime), "yyyy-MM-dd") && (
                              <>
                                {" ~ "}
                                {format(new Date(req.endDateTime), "yyyy-MM-dd")}
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  ) : (

                      <div className="space-y-1">
                        <div className="font-medium">{req.facility?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(req.startDateTime), "yyyy-MM-dd HH:mm")} ~{" "}
                          {format(new Date(req.endDateTime), "HH:mm")}

                          
                        </div>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right space-x-2">
                    {req.status === "REQUESTED" && (
                      <>

                        <Button 
                          size="sm" 
                          onClick={() => 
                          approveRequest(req)}
                        >
                          승인
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectTarget(req);
                            setRejectReason("");
                          }}
                        >
                          거절
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* 거절 사유 입력 모달 */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>요청 거절</DialogTitle>
          </DialogHeader>

          <Textarea
            placeholder="거절 사유를 입력하세요"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />

          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={async () => {
                await rejectRequestWithReason(rejectTarget!, rejectReason);
                setRejectTarget(null);
              }}
            >
              거절 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거절 사유 보기 모달 */}
      <Dialog
        open={!!viewRejectTarget}
        onOpenChange={() => setViewRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>거절 사유</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              신청자: {viewRejectTarget?.user.name}
            </div>

            <div className="p-3 border rounded bg-muted/30 whitespace-pre-wrap">
              {viewRejectTarget?.rejectionReason 
                ?? (viewRejectTarget as any)?.rejectReason 
                ?? "거절 사유 없음"}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setViewRejectTarget(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
