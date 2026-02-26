"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// 카테고리 고정 옵션 (탭 순서 고정용)
const CATEGORY_OPTIONS = [
  "카메라", "삼각대", "렌즈", "필터", "마이크",
  "오디오", "조명기", "충전기", "메모리카드", "배터리", "반사판", 
  "카드리더기", "스탠드", "케이블", "SD카드", "기타",
] as const;

// ===== 타입 =====
type EquipmentStatus = "available" | "rented" | "damaged" | "reserved";
type Category = typeof CATEGORY_OPTIONS[number];
type TabCategory = "all" | Category;

interface Equipment {
  id: string;
  name: string;
  managementNumber: string;
  assetNumber?: string;     // (자산번호)
  classification?: string;  // (분류)
  accessories?: string;     // (부속품)
  note?: string;            // (비고)
  status: EquipmentStatus;
  category: typeof CATEGORY_OPTIONS[number] | "";
  usageInfo?: string;
}

const statusMap = {
  available: { text: "대여 가능", variant: "default" as const },
  rented: { text: "대여중", variant: "secondary" as const },
  damaged: { text: "파손", variant: "destructive" as const },
  reserved: { text: "예약중", variant: "outline" as const },
};

type CartMap = Record<string, number>;

// 로컬 장바구니 읽기
const getCartFromLocalStorage = (): CartMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const enumerateDates = (from: Date, to: Date): Date[] => {
  const start = new Date(from); start.setHours(0,0,0,0);
  const end = new Date(to);     end.setHours(0,0,0,0);
  if (isNaN(+start) || isNaN(+end)) return [];
  const arr: Date[] = [];
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    arr.push(new Date(cur));
  }
  return arr;
};

const EquipmentTable = ({
  items,
  cart,
  handleAddToCart,
  onView,
}: {
  items: Equipment[];
  cart: CartMap;
  handleAddToCart: (itemId: string) => void;
  onView: (item: Equipment) => void;
}) => (
  <div className="border rounded-lg overflow-hidden">


    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="border-r border-border w-16 text-center">
              No.
          </TableHead>
          <TableHead className="border-r border-border">관리번호</TableHead>
          <TableHead className="border-r border-border">자산번호</TableHead>  
          <TableHead className="border-r border-border">장비명</TableHead>
          <TableHead>상세보기</TableHead>
          <TableHead className="text-right">장바구니</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => {
          const alreadyInCart = !!cart[item.id];
          const canAdd = !alreadyInCart;
          return (
            <TableRow key={item.id}>
              <TableCell className="w-16 text-center text-muted-foreground">
                {index + 1}
              </TableCell>

              <TableCell className="text-muted-foreground">{item.managementNumber}</TableCell>

              <TableCell className="border-r border-border">
                {item.assetNumber}
              </TableCell>

              <TableCell className="font-medium">{item.name}</TableCell>

              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onView(item)}
                >
                  상세보기
                </Button>
              </TableCell>

              <TableCell className="text-right">
                <Button
                  variant={alreadyInCart ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleAddToCart(item.id)}
                  disabled={!canAdd}
                >
                  {alreadyInCart ? "담김" : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" /> 담기
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

// ===== 페이지 컴포넌트 =====
export default function EquipmentPage() {
  const [viewTarget, setViewTarget] = useState<Equipment | null>(null);
  const [items, setItems] = useState<Equipment[]>([]);
  const [cart, setCart] = useState<CartMap>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabCategory>("all");

  const [detailTab, setDetailTab] = useState<"usage" | "calendar">("usage");

  // 모달 전용: 예약 목록 상태
  const [reservations, setReservations] = useState<{ from: Date; to: Date }[]>([]);

    useEffect(() => {
      const fetchEquipments = async () => {
        const res = await fetch("/api/equipments");
        if (!res.ok) return;

        const data = await res.json();

        const reverseStatusMap: Record<string, EquipmentStatus> = {
          AVAILABLE: "available",
          RENTED: "rented",
          BROKEN: "damaged",
          RESERVED: "reserved",
        };

        const mapped: Equipment[] = data.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          managementNumber: item.managementNumber,
          assetNumber: item.assetNumber,
          classification: item.classification,
          accessories: item.accessories,
          note: item.note,
          category: item.category,
          usageInfo: item.usageInfo,
          status: reverseStatusMap[item.status] ?? "available",
        }));

        setItems(mapped);
      };

      fetchEquipments();
    }, []);


  useEffect(() => {
    setCart(getCartFromLocalStorage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const handleAddToCart = (itemId: string) => {
    setCart((prev) => {
      if (prev[itemId]) return prev;
      return { ...prev, [itemId]: 1 };
    });
  };

  const categories = useMemo<TabCategory[]>(() => {
    const existing = new Set<Category>(
      items
        .map((i) => i.category)
        .filter((x): x is Category => Boolean(x))
    );
    return ["all", ...CATEGORY_OPTIONS.filter((c) => existing.has(c))];
  }, [items]);

  const filteredEquipment = items
    .filter((item) => activeTab === "all" || item.category === activeTab)
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      return (
        (item.name || "").toLowerCase().includes(term) ||
        (item.managementNumber || "").toLowerCase().includes(term)
      );
    });

    useEffect(() => {
      if (!viewTarget) return;

      setReservations([]);

      const fetchReservations = async () => {
        const res = await fetch(
          `/api/equipments/${viewTarget.id}/reservations`
        );
        if (!res.ok) return;

        const data = await res.json();

        setReservations(
          data.map((r: any) => ({
            from: new Date(r.startDate),
            to: new Date(r.endDate),
          }))
        );
      };

      fetchReservations();
    }, [viewTarget]);


  const reservedDates = useMemo(() => {
    return reservations.flatMap(({ from, to }) => enumerateDates(from, to));
  }, [reservations]);

  const defaultMonth = useMemo(() => {
    if (reservedDates.length === 0) return new Date();
    const minTs = Math.min(...reservedDates.map((d) => d.getTime()));
    return new Date(minTs);
  }, [reservedDates]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">장비 목록</h1>
        <Button asChild>
          <Link href="/dashboard/cart">
            <ShoppingCart className="mr-2 h-4 w-4" />
            장바구니 보기 ({Object.keys(cart).length})
          </Link>
        </Button>
      </div>

      {/* 검색 +  카테고리 필터 */}
      <div className="flex gap-2"> 
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="장비명 또는 관리번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 카테고리 드롭다운 */}
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabCategory)}
        >

          <option value="all">전체</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>


      <EquipmentTable
        items={filteredEquipment}
        cart={cart}
        handleAddToCart={handleAddToCart}
        onView={(item) => setViewTarget(item)}
      />


      {/* 상세보기 모달: 사용법 / 대출현황 토글 */}
      <Dialog 
        open={!!viewTarget} 
        onOpenChange={(open) => {
            if (!open) {
              setViewTarget(null);
              setReservations([]);   
              setDetailTab("usage");  
            }
          }}
        >
        <DialogContent aria-describedby="equipment-detail">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name} 상세보기</DialogTitle>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant={detailTab === "usage" ? "default" : "outline"}
                onClick={() => setDetailTab("usage")}
              >
                장비 상세 정보
              </Button>
              <Button
                size="sm"
                variant={detailTab === "calendar" ? "default" : "outline"}
                onClick={() => setDetailTab("calendar")}
              >
                예약현황
              </Button>
            </div>
          </DialogHeader>

          {/* 스크린리더용 설명(경고 제거용) */}
          <p id="equipment-detail" className="sr-only">
            장비 사용법과 예약 현황을 볼 수 있는 모달입니다.
          </p>

          {detailTab === "usage" && viewTarget && (
            <div className="space-y-4 text-sm">

              {/* 분류 */}
              <div>
                <div className="font-semibold">분류</div>
                <div className="text-muted-foreground">
                  {viewTarget.classification || "등록된 분류가 없습니다."}
                </div>
              </div>

              {/* 부속품 */}
              <div>
                <div className="font-semibold">부속품</div>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {viewTarget.accessories || "등록된 부속품이 없습니다."}
                </div>
              </div>

              {/* 비고 */}
              <div>
                <div className="font-semibold">비고</div>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {viewTarget.note || "등록된 비고가 없습니다."}
                </div>
              </div>
            </div>
          )}


            {detailTab === "calendar" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">예약 현황</h3>
                </div>

                <Calendar
                  key={`${viewTarget?.id}-${reservations.length}`}
                  mode="multiple"
                  selected={reservedDates}
                  defaultMonth={defaultMonth}
                  showOutsideDays
                  onSelect={() => {}}   
                />

                <div className="mt-2 text-xs text-muted-foreground">
                  · 진하게 표시된 날짜 = 진행 중 또는 예약된 일정(반납일까지 포함)
                </div>
                {reservedDates.length === 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    현재 표시할 일정이 없습니다.
                  </div>
                )}
              </div>
            )}
          <DialogFooter>
            <Button onClick={() => setViewTarget(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
