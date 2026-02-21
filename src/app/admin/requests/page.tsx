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


// 타입

type RequestStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED";




interface RentalRequestItem {
  equipment: {
    name: string;
    managementNumber: string;
  };
}

interface RentalRequest {
  // id: string;
  id: number;
  status: RequestStatus;
  createdAt: string;

  rejectionReason?: string;

  user: {
    name: string; 
    email: string;
    studentId?: string;
  };

  items: RentalRequestItem[];
}


const statusMap: Record<
  RequestStatus,
  { text: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  REQUESTED: { text: "승인 대기", variant: "secondary" },
  APPROVED: { text: "승인 완료", variant: "default" },
  REJECTED: { text: "거절됨", variant: "destructive" },
};



/* ======================================================
  컴포넌트
====================================================== */

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestStatus>("REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminClaim, setIsAdminClaim] = useState<boolean | null>(null);
  const { setPendingCount } = usePendingRequest();
  const [viewRejectTarget, setViewRejectTarget] = useState<RentalRequest | null>(null);


  // 🆕 [추가] 거절 사유 모달 상태 (❗ 컴포넌트 안)
  const [rejectTarget, setRejectTarget] =
    useState<RentalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = async (status: RequestStatus) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `http://localhost:4000/admin/rental-requests?status=${status}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
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

  // useEffect에서는 fetchRequests만 호출
  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab]);


  /* ===============================
     승인
  =============================== */

  const approveAndStartRental = async (req: RentalRequest) => {
    await fetch(`http://localhost:4000/rental-requests/${req.id}/approve`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ status: "APPROVED" })
  });

  setPendingCount(prev => Math.max(prev - 1, 0));
    await fetchRequests(activeTab); 
  };

  /* ===============================
     ❌ 거절 (사유 포함)
  =============================== */


  const rejectRequestWithReason = async (
  req: RentalRequest,
  reason: string
) => {
  await fetch(
    `http://localhost:4000/rental-requests/${req.id}/reject`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ 
        status: "REJECTED", 
        reason: reason,
       }),
    }
  );

  setPendingCount(prev => Math.max(prev - 1, 0));
  await fetchRequests(activeTab); // 다시 조회

};

  /* ===============================
     렌더
  =============================== */
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
        <TabsList>
          <TabsTrigger value="REQUESTED">승인 대기</TabsTrigger>
          <TabsTrigger value="APPROVED">승인 완료</TabsTrigger>
          <TabsTrigger value="REJECTED">거절됨</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신청일</TableHead>
                <TableHead>신청자</TableHead>
                <TableHead>항목</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">처리</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {requests.map((req) => (
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
                    {req.items?.map((item, idx) => {
                      const eq = item.equipment;

                      if (!eq) return <div key={idx}>삭제된 장비</div>;

                      const hasNumber = !!eq.managementNumber;
                      const hasName = !!eq.name;

                      if (hasNumber && hasName) {
                        return (
                          <div key={idx}>
                            {eq.managementNumber} ({eq.name})
                          </div>
                        );
                      }

                      if (hasNumber) {
                        return (
                          <div key={idx}>
                            {eq.managementNumber}
                          </div>
                        );
                      }

                      if (hasName) {
                        return (
                          <div key={idx}>
                            {eq.name}
                          </div>
                        );
                      }

                      return <div key={idx}>장비 정보 없음</div>;
                    })}
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

                  <TableCell className="text-right space-x-2">
                    {req.status === "REQUESTED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveAndStartRental(req)}
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
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* 🆕 [추가] 거절 사유 입력 모달 */}
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

      {/* 🔎 거절 사유 보기 모달 */}
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
              {viewRejectTarget?.rejectionReason || "  "}
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
