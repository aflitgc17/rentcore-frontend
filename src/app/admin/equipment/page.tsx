"use client";

import { useState, useEffect } from "react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import * as XLSX from "xlsx";

import { useToast } from "@/components/ui/simple-toast";

// ------------------ 상수 & 타입 ------------------
const CATEGORY_OPTIONS = [
  "카메라", "삼각대", "렌즈", "필터", "마이크",
  "오디오", "조명기", "충전기", "메모리카드", "배터리", "반사판", 
  "카드리더기", "스탠드", "케이블", "SD카드", "기타",
] as const;

type EquipmentStatus = "available" | "rented" | "damaged" | "reserved";

interface Equipment {
  id: string;
  name: string;
  managementNumber: string;
  assetNumber?: string;     // (자산번호)
  classification?: string;  // (분류)
  accessories?: string;     // (부속품)
  note?: string;            // (비고)
  status: EquipmentStatus;
  // imageUrl: string;
  category: typeof CATEGORY_OPTIONS[number] | "";
  usageInfo?: string;
}

const statusMap: Record<
  EquipmentStatus,
  { text: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  available: { text: "대여 가능", variant: "default" },
  rented: { text: "대여중", variant: "secondary" },
  damaged: { text: "파손", variant: "destructive" },
  reserved: { text: "예약중", variant: "outline" },
};

const initialFormData: Omit<Equipment, "id"> = {
  name: "",
  managementNumber: "",
  category: "",
  status: "available",
  usageInfo: "",
};

// ------------------ 컴포넌트 ------------------
export default function AdminEquipmentPage() {
  const { toast } = useToast();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [filteredList, setFilteredList] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("all"); 

  const [isDialogOpen, setIsDialogOpen] = useState(false); 
  const [currentEquipment, setCurrentEquipment] =
    useState<Equipment | null>(null); 
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false); // ⭐ 추가
  const [detailItem, setDetailItem] = useState<Equipment | null>(null); // ⭐ 추가


  const handleDetailOpen = (item: Equipment) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  };



  const fetchEquipments = async () => {
  try {
    const res = await fetch("http://localhost:4000/equipments");
    const data = await res.json();

    const reverseStatusMap: Record<string, EquipmentStatus> = {
      AVAILABLE: "available",
      RENTED: "rented",
      BROKEN: "damaged",
    };

    const mapped: Equipment[] = data.map((item: any) => ({
      id: String(item.id), // ✅ 숫자 → 문자열 변환 (중요)
      name: item.name,
      managementNumber: item.managementNumber,
      assetNumber: item.assetNumber,         
      classification: item.classification,    
      accessories: item.accessories,         
      note: item.note,                      
      category: item.category,
      // imageUrl: item.imageUrl,
      usageInfo: item.usageInfo,
      status: reverseStatusMap[item.status] ?? "available",
    }));

    setEquipmentList(mapped);

  } catch (err) {
    console.error("장비 조회 실패", err);
  }
};


  useEffect(() => {
    fetchEquipments();
  }, []);


  // ------------------ 검색 ------------------
  useEffect(() => {
    const term = searchTerm.toLowerCase();

    setFilteredList(
      equipmentList.filter((i) => {
        const matchesSearch =
          i.name.toLowerCase().includes(term) ||
          i.managementNumber.toLowerCase().includes(term);

        const matchesCategory =
          selectedCategory === "all" ||  // ⭐ 추가
          i.category === selectedCategory; // ⭐ 추가

        return matchesSearch && matchesCategory; // ⭐ 수정
      })
    );
  }, [searchTerm, equipmentList, selectedCategory]); 

  // ------------------ 삭제 ------------------
  const handleDelete = async (id: string) => { // ⭐ 추가
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`http://localhost:4000/equipments/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast({ title: "삭제 완료" });
      fetchEquipments();
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  // ------------------ 수정 다이얼로그 열기 ------------------
  const handleEditOpen = (item: Equipment) => { // ⭐ 추가
    setCurrentEquipment(item);
    setIsDialogOpen(true);
  };

  // ------------------ 수정 저장 ------------------
  const handleUpdate = async () => { // ⭐ 추가
    if (!currentEquipment) return;

    try {
      const res = await fetch(
        `http://localhost:4000/equipments/${currentEquipment.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentEquipment),
        }
      );

      if (!res.ok) throw new Error();

      toast({ title: "수정 완료" });
      setIsDialogOpen(false);
      fetchEquipments();
    } catch {
      toast({ title: "수정 실패", variant: "destructive" });
    }
  };

  // ------------------ 엑셀 업로드 ------------------
  const handleExcelUpload = async () => {
  if (!excelFile) return;

  const buffer = await excelFile.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet, {
    range: 2,
    header: 1,  
  });

  const cleanedRows = rows.filter((row) => row?.[0] && String(row[0]).includes("-"));

  const mappedData = cleanedRows.map((row) => ({
  managementNumber: String(row?.[0] ?? "").trim(),
  assetNumber: row?.[1] ?? "",
  category: row?.[2] ?? "",
  classification: row?.[3] ?? "",
  name: row?.[4] ?? "",
  accessories: row?.[5] ?? "",
  note: row?.[6] ?? "",
  status: "AVAILABLE",   
}));


  const res = await fetch("http://localhost:4000/equipments/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mappedData),
  });

  if (!res.ok) {
    toast({ title: "업로드 실패", variant: "destructive" });
    return;
  }

  toast({ title: "엑셀 업로드 완료" });


  fetchEquipments(); 

  setExcelFile(null);
};

  // ------------------ UI ------------------
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-3xl font-bold">장비 관리</h1>

        <div className="flex gap-2">
          {/* ⭐ EXCEL */}
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
          />

          <Button
            variant="outline"
            disabled={!excelFile}
            onClick={handleExcelUpload}
          >
            파일 업로드
          </Button>

        </div>
      </div>

      {/* 🔍 검색 + 📂 카테고리 필터 */}
      <div className="flex gap-2"> {/* ⭐ 수정 (flex로 변경) */}
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
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">전체</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

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
            <TableHead className="border-r border-border">카테고리</TableHead>
            <TableHead className="border-r border-border">상세보기</TableHead>  
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredList.map((item, index) => (
            <TableRow key={item.id}>  
            <TableCell className="border-r border-border text-center text-muted-foreground">
              {index + 1}
            </TableCell>
            <TableCell className="border-r border-border">
              {item.managementNumber}
            </TableCell>
            <TableCell className="border-r border-border">
              {item.assetNumber}
            </TableCell>
            <TableCell className="border-r border-border">
              {item.name}
            </TableCell>
            <TableCell className="border-r border-border">
              {item.category}
            </TableCell>

            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDetailOpen(item)}  
              >
                상세보기
              </Button>
            </TableCell>


            {/* 작업 버튼 드롭다운 */}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleEditOpen(item)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      수정
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle> {detailItem?.name} 상세 정보</DialogTitle>
    </DialogHeader>

    {detailItem && (
      <div className="space-y-3 text-sm">
        <div>
          <strong>분류:</strong> {detailItem.classification}
        </div>

        <div>
          <strong>부속품:</strong>
          <div className="whitespace-pre-wrap">
            {detailItem.accessories}
          </div>
        </div>

        <div>
          <strong>비고:</strong>
          <div className="whitespace-pre-wrap">
            {detailItem.note}
          </div>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>


      {/* 다이얼로그 */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>장비 수정</DialogTitle>
        </DialogHeader>

        {currentEquipment && (
          <div className="space-y-4">

            {/* 관리번호 */}
            <div>
              <Label>관리번호</Label>
              <Input
                value={currentEquipment.managementNumber}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    managementNumber: e.target.value,
                  })
                }
              />
            </div>

            {/* 자산번호 */}
            <div>
              <Label>자산번호</Label>
              <Input
                value={currentEquipment.assetNumber || ""}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    assetNumber: e.target.value,
                  })
                }
              />
            </div>

            {/* 장비명 */}
            <div>
              <Label>장비명</Label>
              <Input
                value={currentEquipment.name}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    name: e.target.value,
                  })
                }
              />
            </div>

            {/* 카테고리 */}
            <div>
              <Label>카테고리</Label>
              <select
                className="w-full border rounded-md p-2"
                value={currentEquipment.category}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    category: e.target.value as any,
                  })
                }
              >
                <option value="">선택</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 분류 */}
            <div>
              <Label>분류</Label>
              <Input
                value={currentEquipment.classification || ""}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    classification: e.target.value,
                  })
                }
              />
            </div>

            {/* 부속품 */}
            <div>
              <Label>부속품</Label>
              <Textarea
                value={currentEquipment.accessories || ""}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    accessories: e.target.value,
                  })
                }
              />
            </div>

            {/* 비고 */}
            <div>
              <Label>비고</Label>
              <Textarea
                value={currentEquipment.note || ""}
                onChange={(e) =>
                  setCurrentEquipment({
                    ...currentEquipment,
                    note: e.target.value,
                  })
                }
              />
            </div>

            <Button onClick={handleUpdate}>저장</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    </div>
  );
}