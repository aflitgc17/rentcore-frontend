"use client";

import { useState } from "react";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/components/ui/simple-toast";


const { toast } = useToast();


export default function AddEquipmentPage() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast({
      title: "이미지를 선택하세요",
    });

    try {
      setLoading(true);

      // 1️⃣ Cloudinary에 업로드
      const imageUrl = await uploadToCloudinary(file);

      const id = uuidv4(); // 장비 ID
      await fetch("http://localhost:4000/equipments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-admin": "true", // 관리자 전용이면
        },
        body: JSON.stringify({
            name,
            imageUrl,
            status: "available",
        }),
    });

      toast({
      title: "장비가 등록되었습니다!",
    });
      setName("");
      setFile(null);
    } catch (err) {
      console.error(err);
      toast({
      title: "업로드 실패",
    });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="장비 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="border p-2 rounded"
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? "업로드 중..." : "등록"}
      </button>
    </form>
  );
}
