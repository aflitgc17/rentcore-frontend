import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export function useCurrentUser() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          setProfile(null);
        } else {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error("유저 조회 실패", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  return { profile, loading };
}