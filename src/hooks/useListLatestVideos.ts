import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const VIDEO_API_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL;

if (!VIDEO_API_URL) {
  throw new Error("Missing EXPO_PUBLIC_VIDEOMETADATA_API_URL in env.");
}

const API_BASE = VIDEO_API_URL.replace(/\/$/, "");

export interface LatestVideoItem {
  id: number;
  channel_id?: number;
  title: string;
  description?: string | null;
  original_file_key?: string | null;
  processing_status?: string | null;
  visibility?: "private" | "unlisted" | "public";
  thumbnail_url?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  duration_seconds?: number;
  view_count?: number;
  channel_display_name?: string;
  channel_avatar_url?: string;
  category_id?: number | null;
  category_name?: string | null;
  main_category_id?: number | null;
  main_category_name?: string | null;
  main_topic_id?: number | null;
  main_topic_name?: string | null;
  additional_categories?: Array<{ id: number; name: string }> | null;
  additional_topics?: Array<{ id: number; name: string }> | null;
  format_tags?: string[] | null;
  tags?: string | null;
  links?: string[] | null;
  chapters?: string[] | null;
  watch_progress?: {
    last_position_seconds?: number;
    watch_duration_seconds?: number;
    completed?: boolean;
  };
}

export interface LatestVideosResponse {
  videos: LatestVideoItem[];
  count: number;
  page: number;
  limit: number;
  has_more: boolean;
}

type FetchState = {
  videos: LatestVideoItem[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  fetchingMore: boolean;
  error: string | null;
};

const initialState: FetchState = {
  videos: [],
  page: 1,
  hasMore: true,
  loading: true,
  refreshing: false,
  fetchingMore: false,
  error: null,
};

export function useListLatestVideos(pageSize = 40) {
  const userId = useUserStore((state) => state.user?.id);
  const numericUserId = useMemo(() => {
    const maybe = Number(userId);
    return Number.isFinite(maybe) ? maybe : undefined;
  }, [userId]);
  const [state, setState] = useState<FetchState>(initialState);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setState((prev) => ({
        ...prev,
        loading: replace ? true : prev.loading,
        refreshing: replace ? prev.refreshing : prev.refreshing,
        fetchingMore: replace ? false : true,
        error: null,
      }));

      try {
        const url = new URL(`${API_BASE}/videos/latest`);
        url.searchParams.set("p", String(pageToLoad));
        url.searchParams.set("l", String(pageSize));
        if (numericUserId) {
          url.searchParams.set("user_id", String(numericUserId));
        }
        const res = await authFetch(url.toString(), { method: "GET" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to list latest videos (${res.status})`);
        }
        const payload = (await res.json()) as LatestVideosResponse;
        pageRef.current = payload.page;
        setState((prev) => ({
          ...prev,
          videos: replace ? payload.videos : [...prev.videos, ...payload.videos],
          page: payload.page,
          hasMore: payload.has_more,
          loading: false,
          refreshing: false,
          fetchingMore: false,
          error: null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load videos.";
        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          fetchingMore: false,
          error: message,
        }));
      } finally {
        loadingRef.current = false;
      }
    },
    [numericUserId, pageSize]
  );

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await fetchPage(1, true);
  }, [fetchPage]);

  const fetchNextPage = useCallback(async () => {
    if (state.fetchingMore || state.loading || !state.hasMore) {
      return;
    }
    await fetchPage(pageRef.current + 1, false);
  }, [fetchPage, state.fetchingMore, state.hasMore, state.loading]);

  useEffect(() => {
    void fetchPage(1, true);
  }, [numericUserId, pageSize, fetchPage]);

  return {
    videos: state.videos,
    isLoading: state.loading,
    isRefreshing: state.refreshing,
    isFetchingMore: state.fetchingMore,
    hasMore: state.hasMore,
    error: state.error,
    refresh,
    fetchNextPage,
  };
}
