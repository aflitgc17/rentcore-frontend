"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Mic, PencilRuler, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/simple-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function ReservationsPage() {
  const { toast } = useToast();
  const { profile, loading } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);


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

type Facility = {
  id: number;
  name: string;
};

type UserProfile =
  | {
      id?: number; 
      name: string;
      department: string;
      studentId: string;
      email?: string | null;
    }
  | null;

type ConflictItem = {
  id: string | number;
  startAt: string; 
  endAt: string; 
  requesterName?: string | null; 
};

const initialFormState = {
  date: "",
  startTime: "",
  endTime: "",
  computer: "",
  subjectName: "",
  purpose: "",
  team: [] as TeamMember[],
};

const API_BASE = "/api";

function useCurrentUser() {
  const [profile, setProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetch(`${API_BASE}/my/profile`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading };
}

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

function generateTimeOptions() {
  const times: string[] = [];

  let hour = 9;
  let minute = 30;

  while (hour < 18 || (hour === 18 && minute === 0)) {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    times.push(`${hh}:${mm}`);

    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour++;
    }
  }

  return times;
}

function fmtRangeFromISO(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${hhmm(s)} ~ ${hhmm(e)}`;
}


async function fetchConflicts(params: {
  facility: string;
  date: string;
  startTime: string;
  endTime: string;
  computer?: string;
}): Promise<ConflictItem[]> {
  const { facility, date, startTime, endTime, computer } = params;

  const qs = new URLSearchParams({
    facilityName: facility,
    date,
    start: startTime,
    end: endTime,
    ...(computer && { computer }),
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
  // const [teamMember, setTeamMember] = useState({ name: "", studentId: "" });
  const timeOptions = generateTimeOptions();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  

  // 겹침 상태
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [checking, setChecking] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // 시간 유효성 검사 함수
  const isTimeValid = () => {
    const { startTime, endTime } = formData;
    if (!startTime || !endTime) return true;
    return startTime < endTime;
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

      if (facilityName === "편집실" && !formData.computer) {
        setConflicts([]);
        return;
      }

      if (startTime >= endTime) {
        setConflicts([]);
        return;
      }

      setChecking(true);
      try {
        const list = await fetchConflicts({
          facility: formData.computer || facilityName,
          date,
          startTime,
          endTime,
          computer: formData.computer,
        });
        if (!cancelled) setConflicts(list);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.date, formData.startTime, formData.endTime, formData.computer, facilityName]);

  // const handleTeamMemberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
  //   setTeamMember((prev) => ({ ...prev, [name]: value }));
  // };

  // const addTeamMember = () => {
  //   if (teamMember.name && teamMember.studentId) {
  //     setFormData((prev) => ({ ...prev, team: [...prev.team, teamMember] }));
  //     setTeamMember({ name: "", studentId: "" });
  //   }
  // };

  const removeTeamMember = (index: number) => {
    setFormData((prev) => ({ ...prev, team: prev.team.filter((_, i) => i !== index) }));
  };

  const isFormComplete = () => {
    const { date, startTime, endTime, subjectName, purpose } = formData;
    return Boolean(
      userInfo &&
      date &&
      startTime &&
      endTime &&
      subjectName &&
      purpose
    );
  };

  // const cleanedTeam = formData.team.filter(
  //   (m) => m.name.trim() && m.studentId.trim()
  // );
  //   };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete() || !userInfo) return;
    if (conflicts.length > 0) return;

    const cleanedTeam = formData.team.filter(
      (m) => m.name.trim() && m.studentId.trim()
    );

    const submissionData = {
      ...userInfo,
      ...formData,
      team: cleanedTeam,
      headcount: cleanedTeam.length + 1,
    };

    const result = await onSubmit(submissionData);

    if (result?.success) {
      setFormData(initialFormState);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-muted/40 shadow-sm">
        <CardContent className="py-0.5 px-5">
          {userInfo ? (
            <div className="grid sm:grid-cols-3 gap-x-4 gap-y-1">
              <div className="leading-tight">
                <Label className="text-xs text-muted-foreground">예약자명</Label>
                <p className="text-sm font-semibold">{userInfo.name}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs text-muted-foreground">학과</Label>
                <p className="text-sm font-semibold">{userInfo.department}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs text-muted-foreground">학번</Label>
                <p className="text-sm font-semibold">{userInfo.studentId}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              로그인 후 예약자 정보가 표시됩니다.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">

          <Label>사용일</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, "yyyy-MM-dd")
                  : "날짜 선택"}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    setFormData((prev) => ({
                      ...prev,
                      date: format(date, "yyyy-MM-dd"),
                    }));
                  }
                }}
                disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                return (
                  date < today ||      // 오늘 이전 막기
                  date.getDay() === 0 || // 일요일
                  date.getDay() === 6    // 토요일
                );
              }}
            />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">사용 시작 시간</Label>

          <select
            id="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">사용 종료 시간</Label>

          <select
            id="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isTimeValid() && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>시간 설정 오류</AlertTitle>
          <AlertDescription>
            종료 시간은 시작 시간보다 늦어야 합니다.
          </AlertDescription>
        </Alert>
      )}

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

      {facilityName === "편집실" && (
        <div className="space-y-2">
          <Label htmlFor="computer">사용 컴퓨터</Label>
          <select
            id="computer"
            value={formData.computer || ""}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            <option value="편집실1-1">편집실1-1</option>
            <option value="편집실1-2">편집실1-2</option>
            <option value="편집실2-1">편집실2-1</option>
            <option value="편집실2-2">편집실2-2</option>
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subjectName">교과목명</Label>
        <Input
          id="subjectName"
          value={formData.subjectName}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">사용 목적</Label>
        <Input
          id="purpose"
          value={formData.purpose}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label>팀원 추가 (선택)</Label>
          <p className="text-sm text-muted-foreground">
            총 인원: {formData.team.filter(m => m.name && m.studentId).length + 1}명
          </p>
        </div>

        {formData.team.map((member, index) => (
          <div key={index} className="flex items-end gap-2">
            <Input
              placeholder="팀원 이름"
              value={member.name}
              onChange={(e) => {
                const newTeam = [...formData.team];
                newTeam[index].name = e.target.value;
                setFormData((prev) => ({ ...prev, team: newTeam }));
              }}
            />

            <Input
              placeholder="팀원 학번"
              value={member.studentId}
              onChange={(e) => {
                const newTeam = [...formData.team];
                newTeam[index].studentId = e.target.value;
                setFormData((prev) => ({ ...prev, team: newTeam }));
              }}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  team: prev.team.filter((_, i) => i !== index),
                }))
              }
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        {/* 여기! map 밖에 있어야 함 */}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              team: [...prev.team, { name: "", studentId: "" }],
            }))
          }
        >
          팀원 추가
        </Button>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            !userInfo ||
            disabled ||
            !Boolean(formData.date && formData.startTime && formData.endTime && formData.subjectName && formData.purpose) ||
            conflicts.length > 0 ||
            checking
          }
        >
          예약 요청하기
        </Button>
      </div>
    </form>
  );
}

/* =========================
   페이지
========================= */

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

      let facilityNameToSend = "";

      if (facilityName === "녹음실") {
        facilityNameToSend = "녹음실";
      } else {
        if (!data.computer) {
          toast({
            title: "사용 공간을 선택하세요",
            variant: "destructive",
          });
          return { success: false };
        }

        facilityNameToSend = data.computer; 
      }

      try {
        setSubmitting(true);

        const res = await fetch(`${API_BASE}/facility-reservations`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },


          body: JSON.stringify({
            // facilityId: selectedFacility!.id,
            facilityName: facilityNameToSend,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            computer: data.computer ?? null,
            subjectName: data.subjectName,
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
