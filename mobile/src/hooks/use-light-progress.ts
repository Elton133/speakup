import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type LightProgress = { currentStreak: number; longestStreak: number; points: number };

export function useLightProgress() {
  const [progress, setProgress] = useState<LightProgress>({
    currentStreak: 0,
    longestStreak: 0,
    points: 0,
  });
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase
        .from("user_light_progress")
        .select("current_streak,longest_streak,light_points,last_lit_on")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!row) return;
      const lastLit = row.last_lit_on ? new Date(`${row.last_lit_on}T00:00:00Z`) : null;
      const active = Boolean(lastLit && Date.now() - lastLit.getTime() < 48 * 60 * 60 * 1000);
      setProgress({
        currentStreak: active ? row.current_streak : 0,
        longestStreak: row.longest_streak,
        points: row.light_points,
      });
    });
  }, []);
  return progress;
}
