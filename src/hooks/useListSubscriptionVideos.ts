import { useInfiniteQuery } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";
import type { WatchProgress } from "./useGetWatchProgress";

const USER_API = process.env.EXPO_PUBLIC_USER_API_URL as string;

export interface SubscriptionVideoItem {
  id: number;
  channel_id?: number;
  title: string;
  description?: string | null;
  processing_status?: string | null;
  visibility?: "private" | "unlisted" | "public";
  thumbnail_url?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  duration_seconds?: number;
  view_count?: number;
  original_file_key?: string | null;
  channel_display_name?: string;
  channel_avatar_url?: string;
  watch_progress?: WatchProgress;
}

export interface SubscriptionVideosResponse {
  videos: SubscriptionVideoItem[];
  count: number;
  page: number;
  limit: number;
  has_more: boolean;
}
export function useListSubscriptionVideos(pageSize = 40) {
  const firebaseUID = useUserStore((state) => state.user?.firebase_uid);

  return useInfiniteQuery<SubscriptionVideosResponse>({
    queryKey: ["subscription-videos", firebaseUID, pageSize],
    enabled: Boolean(USER_API) && Boolean(firebaseUID),
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (!USER_API || !firebaseUID) {
        throw new Error("Missing API URL or user");
      }
      const url = new URL(`${USER_API}/users/${firebaseUID}/subscriptions/videos`);
      url.searchParams.set("p", String(pageParam));
      url.searchParams.set("l", String(pageSize));
      const res = await authFetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to list subscription videos (${res.status})`);
      }
      return (await res.json()) as SubscriptionVideosResponse;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.has_more) return undefined;
      return lastPage.page + 1;
    },
  });
}
