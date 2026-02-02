import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../auth/authFetch";

const BASE_URL = process.env.EXPO_PUBLIC_SEARCH_API_URL as string;

export interface SearchChannelItem {
  id?: number;
  display_name?: string;
  description?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  is_verified?: boolean;
  subscriber_count?: number;
  video_count?: number;
  [key: string]: unknown;
}

export interface SearchChannelsResponse {
  results: SearchChannelItem[];
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

export function useSearchChannels(query?: string, pageSize = 40, debounceMs = 600) {
  const normalized = (query ?? "").trim();
  const debouncedQuery = useDebouncedValue(normalized, debounceMs);

  return useInfiniteQuery<SearchChannelsResponse>({
    queryKey: ["search-channels", debouncedQuery, pageSize],
    enabled: Boolean(BASE_URL) && debouncedQuery.length > 0,
    initialPageParam: 0,
    retry: false,
    queryFn: async ({ pageParam = 0 }) => {
      if (!BASE_URL || debouncedQuery.length === 0) {
        throw new Error("Missing search API URL or query");
      }
      const url = new URL(`${BASE_URL}/search/channels`);
      url.searchParams.set("q", debouncedQuery);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(pageParam));
      const res = await authFetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to search channels (${res.status})`);
      }
      return (await res.json()) as SearchChannelsResponse;
    },
    getNextPageParam: (lastPage) => {
      const next = (lastPage?.offset ?? 0) + (lastPage?.limit ?? pageSize);
      if (typeof lastPage?.total !== "number") return undefined;
      return next < lastPage.total ? next : undefined;
    },
  });
}

export function useFlattenedSearchChannels(pages?: SearchChannelsResponse[]) {
  return useMemo(() => {
    if (!pages) return [];
    return pages.flatMap((p) => p.results ?? []);
  }, [pages]);
}
