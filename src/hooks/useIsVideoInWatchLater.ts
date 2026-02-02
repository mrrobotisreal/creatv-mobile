import { useQuery } from "@tanstack/react-query";

import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

type WatchLaterResponse = {
  videos: Array<{ id: number }>;
  has_more?: boolean;
};

const USER_API = process.env.EXPO_PUBLIC_USER_API_URL as string;
const WATCH_LATER_PAGE_LIMIT = 100;
const WATCH_LATER_MAX_PAGES = 50;

async function fetchWatchLaterMembership(firebaseUID: string, videoId: number): Promise<boolean> {
  if (!USER_API) {
    throw new Error("Missing user API URL.");
  }

  let page = 1;
  while (page <= WATCH_LATER_MAX_PAGES) {
    const url = new URL(`${USER_API}/users/${firebaseUID}/playlists/later`);
    url.searchParams.set("p", String(page));
    url.searchParams.set("l", String(WATCH_LATER_PAGE_LIMIT));

    const res = await authFetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to check Watch Later (status ${res.status})`);
    }

    const payload = (await res.json()) as WatchLaterResponse;
    if (payload?.videos?.some((entry) => Number(entry.id) === Number(videoId))) {
      return true;
    }
    if (!payload?.has_more || !Array.isArray(payload.videos) || payload.videos.length === 0) {
      return false;
    }

    page += 1;
  }

  return false;
}

export function useIsVideoInWatchLater(videoId?: number) {
  const firebaseUID = useUserStore((state) => state.user?.firebase_uid);

  return useQuery({
    queryKey: ["watch-later-membership", firebaseUID, videoId],
    enabled: Boolean(USER_API) && Boolean(firebaseUID) && Boolean(videoId),
    staleTime: 60_000,
    queryFn: () => fetchWatchLaterMembership(firebaseUID as string, videoId as number),
  });
}
