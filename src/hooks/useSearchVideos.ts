import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const BASE_URL = process.env.EXPO_PUBLIC_SEARCH_API_URL as string;

export interface SearchVideoItem {
  id?: number;
  title?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number;
  view_count?: number;
  published_at?: string | null;
  created_at?: string | null;
  channel_display_name?: string | null;
  channel_avatar_url?: string | null;
  channel_id?: number;
  [key: string]: unknown;
}

export interface SearchVideosResponse {
  results: SearchVideoItem[];
  total: number;
  limit: number;
  offset: number;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), Math.max(0, delayMs));
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useSearchVideos(query?: string, pageSize = 40, debounceMs = 600) {
  const userId = useUserStore((state) => state.user?.id);
  const numericUserId = useMemo(() => {
    if (!userId) return undefined;
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [userId]);

  const normalized = (query ?? "").trim();
  const debouncedQuery = useDebouncedValue(normalized, debounceMs);

  return useInfiniteQuery<SearchVideosResponse>({
    queryKey: ["search-videos", debouncedQuery, pageSize, numericUserId],
    enabled: Boolean(BASE_URL) && debouncedQuery.length > 0,
    initialPageParam: 0,
    retry: false,
    queryFn: async ({ pageParam = 0 }) => {
      if (!BASE_URL || debouncedQuery.length === 0) {
        throw new Error("Missing search API URL or query");
      }
      const url = new URL(`${BASE_URL}/search/videos`);
      url.searchParams.set("q", debouncedQuery);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(pageParam));
      if (numericUserId) {
        url.searchParams.set("user_id", String(numericUserId));
      }
      const res = await authFetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to search videos (${res.status})`);
      }
      return (await res.json()) as SearchVideosResponse;
    },
    getNextPageParam: (lastPage) => {
      const next = (lastPage?.offset ?? 0) + (lastPage?.limit ?? pageSize);
      if (typeof lastPage?.total !== "number") return undefined;
      return next < lastPage.total ? next : undefined;
    },
  });
}

export function useFlattenedSearchVideos(pages?: SearchVideosResponse[]) {
  return useMemo(() => {
    if (!pages) return [];
    return pages.flatMap((p) => p.results ?? []);
  }, [pages]);
}
