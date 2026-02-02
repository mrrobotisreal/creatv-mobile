import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";

const BASE_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL as string;

export interface WatchProgress {
  user_id: number;
  video_id: number;
  watch_duration_seconds: number;
  last_position_seconds: number;
  completed: boolean;
}

export function useGetWatchProgress(videoId?: number | string, userId?: number | string) {
  const numericUserId = useMemo(() => {
    if (!userId) return undefined;
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [userId]);

  return useQuery<WatchProgress>({
    queryKey: ["watch-progress", videoId, numericUserId],
    enabled: Boolean(videoId) && Boolean(numericUserId) && Boolean(BASE_URL),
    staleTime: 15_000,
    queryFn: async () => {
      const url = new URL(`${BASE_URL}/videos/${videoId}/progress`);
      url.searchParams.set("user_id", String(numericUserId));
      const res = await authFetch(url.toString());
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to fetch progress");
      }
      return (await res.json()) as WatchProgress;
    },
  });
}
