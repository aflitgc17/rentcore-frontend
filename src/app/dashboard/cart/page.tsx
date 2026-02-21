"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowLeft, ShoppingCart, Trash2, Calendar as CalendarIcon } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useToast } from "@/components/ui/simple-toast";
import { useRouter } from "next/navigation";


/* =====================
헬퍼: 날짜 정규화
========================*/

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function endOfDay(d: Date) {
  const x = new Date(d); x.setHours(23,59,59,999); return x;
}


/* =====================
🔥 수정: 영업일 계산 함수 추가
========================*/
const countBusinessDays = (from: Date, to: Date) => {
  let count = 0;
  const cur = new Date(from);

  while (cur <= to) {
    const day = cur.getDay();
    if (day !== 0) count++; // 🔥 수정: 일요일 제외
    cur.setDate(cur.getDate() + 1);
  }

  return count;
};
/* =========================================
   헬퍼: 배열 chunk (TSX 안전)
========================================= */
function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// =====타입=====
type EquipmentStatus = "available" | "rented" | "damaged" | "reserved";
interface Equipment {
  id: string;
  name: string;
  managementNumber: string;
  status: EquipmentStatus;
  category: string;
}

type CartMap = { [id: string]: number };

// =====로컬 스토리지 헬퍼=====
const readCart = (): CartMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeCart = (cart: CartMap) => {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch {}
};

// =====페이지 컴포넌트=====
export default function CartPage() {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const router = useRouter();
  const [rangeError, setRangeError] = useState<string | null>(null);

  // 🔥 추가: 교과목명 / 사용목적
  const [subjectName, setSubjectName] = useState("");
  const [purpose, setPurpose] = useState("");



    useEffect(() => {
      fetch("http://localhost:4000/equipments")
        .then((res) => res.json())
        .then((data) => {
          const mapped = data.map((item: any) => ({
            ...item,
            id: String(item.id),// 🔥 핵심
          }));
          setEquipmentList(mapped);
        })
        .catch(console.error);
    }, []);


  useEffect(() => {
    const stored = readCart();
    setCart(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeCart(cart);
  }, [cart, hydrated]);


  const cartItems = useMemo(() => {
    return Object.keys(cart)
      .map((id) => equipmentList.find((e) => e.id === id) || null)
      .filter((v): v is Equipment => v !== null);
  }, [cart, equipmentList]);

  const totalCount = useMemo(() => cartItems.length, [cartItems]);

  const removeItem = (id: string) =>
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const clearCart = () => {
    setCart({});
    try {
      localStorage.removeItem("cart");
    } catch {}
  };



  // ===== 대여 기간 상태/헬퍼 =====
  const [range, setRange] = useState<DateRange | undefined>();
  const fromAt = range?.from ? startOfDay(range.from) : null;
  const toAt = range?.to ? endOfDay(range.to) : null;

  useEffect(() => {
    if (!fromAt || !toAt) {
      setRangeError(null);
      return;
    }

    if (fromAt.getDay() === 0) {
      setRangeError("시작일은 일요일을 선택할 수 없습니다.");
      return;
    }

    if (toAt.getDay() === 0) {
      setRangeError("종료일은 일요일을 선택할 수 없습니다.");
      return;
    }

    const businessDays = countBusinessDays(fromAt, toAt);

    if (businessDays > 3) {
      setRangeError("대여는 영업일 기준 최대 3일까지 가능합니다.");
      return;
    }

    setRangeError(null);
  }, [fromAt, toAt]);

const validRange = !!fromAt && !!toAt && !rangeError;



  const submitRentalRequest = async () => {

    if (!subjectName.trim()) {
      toast({
        title: "사용 정보 입력 필요",
        description: "교과목명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!purpose.trim()) {
      toast({
        title: "사용 정보 입력 필요",
        description: "사용 목적을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }



    if (cartItems.length === 0) {
      toast({
        title: "장바구니가 비어 있어요",
        description: "원하는 장비를 먼저 담아주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!validRange) {
      toast({
        title: "대여 기간 오류",
        description: "대여 시작/종료 일시를 올바르게 선택하세요.",
        variant: "destructive",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        toast({
            title: "로그인이 필요합니다",
            variant: "destructive",
        });
        router.push("/login");
        return;
    }


    try {
      setSubmitting(true);

      // (1) 기간 겹침 검사
      const equipmentIds = cartItems.map((it) => it.id);
      const res = await fetch(
        "http://localhost:4000/rental-requests/conflicts",
        {
            method: "POST",
            headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            equipmentIds,
            from: fromAt,
            to: toAt,
            }),
        }
        );

      const conflicts = await res.json();


      if (conflicts.length > 0) {
        const names = cartItems
          .filter((it) => conflicts.includes(it.id))
          .map((it) => `${it.name}(${it.managementNumber})`);

        toast({
          title: "예약 불가",
          description: `이미 겹치는 대여 신청이 있습니다:\n- ${names.join("\n- ")}`,
          variant: "destructive",
        });
        return;
      }

    await fetch("http://localhost:4000/rental-requests", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: fromAt,
            to: toAt,
            subjectName,     
            purpose,        
            items: cartItems.map((item) => ({
            equipmentId: item.id,
            managementNumber: item.managementNumber,
            name: item.name,
            category: item.category,
            })),
        }),
    });


      // (7) 성공 처리
      clearCart();
      setRange(undefined);
      setSubmissionSuccess(true);
      
    } catch (e) {
      console.error("submitRentalRequest error:", e);

      toast({
      title: "대여 신청 중 오류가 발생했습니다.",
    });
    
    } finally {
      setSubmitting(false);
    }
  };

  // 신청 성공 화면
  if (submissionSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">대여 신청 완료</h1>
        </div>
        <div className="text-center p-12 border rounded-lg">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="text-lg font-medium">대여 신청이 성공적으로 접수되었습니다!</p>
          <p className="text-muted-foreground mt-1">관리자의 승인 후 대여가 진행됩니다.</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/equipment">장비 목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  //  장바구니가 비었을 때 처리
  if (hydrated && cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">장바구니</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard/equipment">
              <ArrowLeft className="mr-2 h-4 w-4" />
              장비 목록으로
            </Link>
          </Button>
        </div>
        <div className="text-center p-12 border rounded-lg">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">장바구니가 비었습니다.</p>
          <p className="text-muted-foreground mt-1">원하는 장비를 담아보세요.</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/equipment">장비 보러가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 일반 장바구니 화면
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">장바구니</h1>
          <p className="text-muted-foreground mt-1">총 {totalCount}개 품목</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/equipment">
              <ArrowLeft className="mr-2 h-4 w-4" />
              장비 목록으로
            </Link>
          </Button>
          <Button variant="destructive" onClick={clearCart}>
            <Trash2 className="mr-2 h-4 w-4" />
            전체 비우기
          </Button>
        </div>
      </div>

      {/* 대여 기간 선택 섹션 */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">대여 기간</h2>
          <span className="text-sm text-muted-foreground">
            {validRange
              ? `${format(fromAt!, "yyyy-MM-dd")} ~ ${format(toAt!, "yyyy-MM-dd")}`
              : "기간을 선택하세요"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* 날짜 범위 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start w-[260px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {range?.from && range?.to
                  ? `${format(range.from, "yyyy-MM-dd")} ~ ${format(
                      range.to,
                      "yyyy-MM-dd"
                    )}`
                  : "기간 선택(달력)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={{
                before: new Date(),
                dayOfWeek: [0], // 🔥 수정: 일요일 클릭 금지
              }}
              initialFocus
            />
            </PopoverContent>
          </Popover>
          {rangeError && (
            <p className="text-sm text-red-500 mt-2">
              {rangeError}
            </p>
          )}
        </div>
      </div>


      {/* 교과목 / 사용목적 입력 */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">사용 정보</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">사용 교과목명</label>
          <Input
            // placeholder="예: 영상촬영실습, 컴퓨터비전 등"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">사용 목적</label>
          <Input
            // placeholder="예: 과제 촬영, 졸업 작품 준비 등"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>
      </div>


      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {/* <TableHead className="w-[120px]">사진</TableHead> */}
              <TableHead>관리번호</TableHead>
              <TableHead>장비명</TableHead>
              {/* <TableHead className="text-right">액션</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cartItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{item.managementNumber}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                {/* <TableCell className="text-muted-foreground">{item.assetNumber}</TableCell> */}
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 하단 액션 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
              onClick={submitRentalRequest}
              disabled={
                submitting ||
                !validRange ||
                !subjectName.trim() ||
                !purpose.trim()
              }
            >
            {submitting ? "신청 중..." : "대여 신청하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
