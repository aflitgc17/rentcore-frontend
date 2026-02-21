"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Mic, PencilRuler, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/simple-toast";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/* =========================
   상수: 이용수칙
========================= */
const EDITING_ROOM_RULES = [
  "편집실 사용기간은 오전 9시 30분 ~ 오후 6시까지입니다.",
  "편집실 내에서는 음식 섭취를 금합니다(생수 등 간단한 음료는 제외)",
  "사용 희망자는 반드시 예약을 해야 합니다.",
  "허가된 소프트웨어 이외에는 인스톨을 금합니다.",
  "사용 종료 후 PC 전원을 끄고 다음 사용자를 위해 정리 및 쓰레기 정리를 깨끗하게 하길 바랍니다.",
  "PC에 작업 중인 개인 및 팀의 데이터는 개인 저장장치에 저장해 주시길 바랍니다. 데이터 분실에 대한 책임은 일절 지지 않습니다.",
];

const RECORDING_ROOM_RULES = [
  "녹음실 사용기간은 오전 9시 30분 ~ 오후 6시까지입니다.",
  "녹음실 내에서는 음식 섭취를 금합니다(생수 등 간단한 음료는 제외).",
  "사용 희망자는 반드시 예약을 해야 합니다.",
  "허가된 소프트웨어 이외에는 인스톨을 금합니다.",
  "사용 종료 후 장비 전원을 끄고 다음 사용자를 위해 정리 및 쓰레기 정리를 깨끗하게 하길 바랍니다.",
  "데이터 분실에 대한 책임은 일절 지지 않습니다. 주의해 주시기 바랍니다.",
];

/* =========================
   타입
========================= */
type TeamMember = { name: string; studentId: string };

type UserProfile =
  | {
      id?: number; // 서버가 id를 주면 사용(없어도 됨)
      name: string;
      department: string;
      studentId: string;
      email?: string | null;
    }
  | null;

type ConflictItem = {
  id: string | number;
  startAt: string; // ISO
  endAt: string; // ISO
  requesterName?: string | null; // 서버에서 주면 보여줌
};

const initialFormState = {
  date: "",
  startTime: "",
  endTime: "",
  purpose: "",
  team: [] as TeamMember[],
};

/* =========================
   환경: API Base
========================= */
const API_BASE = "http://localhost:4000";

/* =========================
   훅: 현재 사용자/프로필 로드 (JWT 기반)
========================= */
function useCurrentUser() {
  const [profile, setProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading };
}

/* =========================
   컴포넌트: 주의사항 카드
========================= */
const RulesCard = ({ title, rules }: { title: string; rules: string[] }) => (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>
      <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
        {rules.map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
);

/* =========================
   유틸: 겹침 표시용 시간 포맷
========================= */
function fmtRangeFromISO(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${hhmm(s)} ~ ${hhmm(e)}`;
}

/* =========================
   예약 겹침(Conflict) 조회 (서버 API)
   서버는 아래 형태로 응답하면 됨:
   [
     { id, startAt: "ISO", endAt: "ISO", requesterName? }
   ]
========================= */
async function fetchConflicts(params: {
  facility: "편집실" | "녹음실";
  date: string;
  startTime: string;
  endTime: string;
}): Promise<ConflictItem[]> {
  const { facility, date, startTime, endTime } = params;

  const qs = new URLSearchParams({
    facility,
    date,
    start: startTime,
    end: endTime,
  });

  const res = await fetch(`${API_BASE}/facility-reservations/conflicts?${qs.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();

  // 유연하게: 서버가 다른 필드명을 주더라도 최대한 맞춰줌
  return (Array.isArray(data) ? data : []).map((r: any) => ({
    id: r.id ?? r.reservationId ?? crypto.randomUUID(),
    startAt: r.startAt ?? r.start_at ?? r.start ?? r.startISO,
    endAt: r.endAt ?? r.end_at ?? r.end ?? r.endISO,
    requesterName: r.requesterName ?? r.requester?.name ?? r.user?.name ?? null,
  }));
}

/* =========================
   컴포넌트: 예약 폼
========================= */
function ReservationForm({
  isRecording = false,
  onSubmit,
  userInfo,
  disabled,
  facilityName,
}: {
  isRecording?: boolean;
  onSubmit: (data: any) => Promise<{ success: boolean }>;
  userInfo: UserProfile;
  disabled?: boolean;
  facilityName: "편집실" | "녹음실";
}) {
  const [formData, setFormData] = useState(initialFormState);
  const [teamMember, setTeamMember] = useState({ name: "", studentId: "" });

  // 겹침 상태
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [checking, setChecking] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // 날짜/시간 바뀔 때 겹침 조회
  useEffect(() => {
    const { date, startTime, endTime } = formData;
    let cancelled = false;

    (async () => {
      if (!date || !startTime || !endTime) {
        setConflicts([]);
        return;
      }
      setChecking(true);
      try {
        const list = await fetchConflicts({
          facility: facilityName,
          date,
          startTime,
          endTime,
        });
        if (!cancelled) setConflicts(list);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.date, formData.startTime, formData.endTime, facilityName]);

  const handleTeamMemberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTeamMember((prev) => ({ ...prev, [name]: value }));
  };

  const addTeamMember = () => {
    if (teamMember.name && teamMember.studentId) {
      setFormData((prev) => ({ ...prev, team: [...prev.team, teamMember] }));
      setTeamMember({ name: "", studentId: "" });
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData((prev) => ({ ...prev, team: prev.team.filter((_, i) => i !== index) }));
  };

  const isFormComplete = () => {
    const { date, startTime, endTime, purpose } = formData;
    return Boolean(userInfo && date && startTime && endTime && purpose);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete() || !userInfo) return;
    if (conflicts.length > 0) return;

    // 마지막 입력칸 값도 자동 반영
    let finalTeam = formData.team;
    if (teamMember.name && teamMember.studentId) {
      finalTeam = [...finalTeam, teamMember];
    }

    const submissionData = {
      ...userInfo,
      ...formData,
      team: finalTeam,
      headcount: finalTeam.length + 1,
    };

    const result = await onSubmit(submissionData);

    if (result?.success) {
      setFormData(initialFormState);
      setTeamMember({ name: "", studentId: "" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          {userInfo ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>예약자명</Label>
                <p className="text-sm font-medium">{userInfo.name}</p>
              </div>
              <div className="space-y-1">
                <Label>학과</Label>
                <p className="text-sm font-medium">{userInfo.department}</p>
              </div>
              <div className="space-y-1">
                <Label>학번</Label>
                <p className="text-sm font-medium">{userInfo.studentId}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">로그인 후 예약자 정보가 표시됩니다.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">사용일</Label>
          <Input id="date" type="date" value={formData.date} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">사용 시작 시간</Label>
          <Input id="startTime" type="time" value={formData.startTime} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">사용 종료 시간</Label>
          <Input id="endTime" type="time" value={formData.endTime} onChange={handleChange} />
        </div>
      </div>

      {/* 겹침 안내 */}
      {(checking || conflicts.length > 0) && (
        <Alert variant={conflicts.length > 0 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{checking ? "예약 가능 여부 확인 중…" : "해당 시간에 겹치는 예약이 있습니다"}</AlertTitle>

          {!checking && conflicts.length > 0 && (
            <AlertDescription>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                {conflicts.map((r) => (
                  <li key={String(r.id)}>
                    {fmtRangeFromISO(r.startAt, r.endAt)} (신청자: {r.requesterName ?? "익명"})
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">다른 시간대를 선택해 주세요.</p>
            </AlertDescription>
          )}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="purpose">사용 목적</Label>
        <Input
          id="purpose"
          placeholder="사용 목적을 구체적으로 기입"
          value={formData.purpose}
          onChange={handleChange}
        />
      </div>

      {isRecording && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label>팀원 추가 (선택)</Label>
            <p className="text-sm text-muted-foreground">총 인원: {formData.team.length + 1}명</p>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="teamMemberName" className="text-xs">
                팀원 이름
              </Label>
              <Input
                id="teamMemberName"
                name="name"
                placeholder="홍길동"
                value={teamMember.name}
                onChange={handleTeamMemberChange}
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <Label htmlFor="teamMemberId" className="text-xs">
                팀원 학번
              </Label>
              <Input
                id="teamMemberId"
                name="studentId"
                placeholder="20240000"
                value={teamMember.studentId}
                onChange={handleTeamMemberChange}
              />
            </div>

            <Button type="button" variant="outline" size="icon" onClick={addTeamMember}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>

          {formData.team.length > 0 && (
            <div className="space-y-2">
              {formData.team.map((member, index) => (
                <div key={`${member.studentId}-${index}`} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                  <p>
                    {member.name} ({member.studentId})
                  </p>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTeamMember(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            !userInfo ||
            disabled ||
            !Boolean(formData.date && formData.startTime && formData.endTime && formData.purpose) ||
            conflicts.length > 0 ||
            checking
          }
        >
          관리자에게 예약 요청하기
        </Button>
      </div>
    </form>
  );
}

/* =========================
   페이지
========================= */
export default function ReservationsPage() {
  const { toast } = useToast();
  const { profile, loading } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit =
    (facilityName: "편집실" | "녹음실") =>
    async (data: any): Promise<{ success: boolean }> => {
      if (!profile) {
        toast({
          title: "로그인이 필요합니다",
          description: "예약을 진행하려면 로그인해 주세요.",
          variant: "destructive",
        });
        return { success: false };
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        toast({
          title: "로그인이 필요합니다",
          description: "토큰이 없습니다. 다시 로그인해 주세요.",
          variant: "destructive",
        });
        return { success: false };
      }

      try {
        setSubmitting(true);

        const res = await fetch(`${API_BASE}/facility-reservations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            facility: facilityName,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            purpose: data.purpose,
            team: data.team ?? [],
            headcount: data.headcount ?? (data.team?.length ?? 0) + 1,
          }),
        });

        if (!res.ok) {
          // 서버가 JSON 에러를 주면 최대한 보여주기
          let msg = "잠시 후 다시 시도해 주세요.";
          try {
            const j = await res.json();
            msg = j?.message ?? msg;
          } catch {}
          throw new Error(msg);
        }

        toast({
          title: "예약 요청이 접수되었습니다",
          description: `관리자 승인 후 ${facilityName} 사용이 확정됩니다.`,
        });

        return { success: true };
      } catch (err: any) {
        toast({
          title: "예약 신청 실패",
          description: err?.message ?? "잠시 후 다시 시도해 주세요.",
          variant: "destructive",
        });
        return { success: false };
      } finally {
        setSubmitting(false);
      }
    };

  const userInfo = profile
    ? {
        name: profile.name,
        department: profile.department,
        studentId: profile.studentId,
        email: profile.email ?? undefined,
      }
    : null;

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">시설 예약</h1>

      {loading ? (
        <Card className="mb-6">
          <CardContent className="py-6 text-sm text-muted-foreground">사용자 정보를 불러오는 중…</CardContent>
        </Card>
      ) : !profile ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>로그인이 필요합니다</AlertTitle>
          <AlertDescription>예약을 진행하려면 먼저 로그인해 주세요.</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="editing-room" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editing-room">
            <PencilRuler className="mr-2 h-4 w-4" /> 편집실
          </TabsTrigger>
          <TabsTrigger value="recording-studio">
            <Mic className="mr-2 h-4 w-4" /> 녹음실
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editing-room">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">편집실 예약</CardTitle>
              <CardDescription>영화영상학과 편집실(원화관 118호) 예약 양식입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RulesCard title="편집실 주의사항" rules={EDITING_ROOM_RULES} />
              <ReservationForm
                facilityName="편집실"
                onSubmit={handleFormSubmit("편집실")}
                userInfo={userInfo}
                disabled={submitting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording-studio">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">녹음실 예약</CardTitle>
              <CardDescription>영화영상학과 녹음실(원화관 234A호) 예약 양식입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RulesCard title="녹음실 주의사항" rules={RECORDING_ROOM_RULES} />
              <ReservationForm
                facilityName="녹음실"
                isRecording
                onSubmit={handleFormSubmit("녹음실")}
                userInfo={userInfo}
                disabled={submitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
