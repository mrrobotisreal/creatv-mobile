import { useQuery } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";

export interface Channel {
  id: number;
  user_id: number;
  display_name: string;
  description?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  is_verified: boolean;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  is_monetized?: boolean;
  is_private: boolean;
  allow_comments: boolean;
  created_at: string;
  updated_at: string;
}

const BASE_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL as string;

async function fetchChannel(id: number | string): Promise<Channel> {
  const res = await authFetch(`${BASE_URL}/channels/${id}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch channel ${id}`);
  }
  return res.json();
}

export function useGetChannel(channelId?: number | string) {
  return useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => fetchChannel(channelId as number | string),
    enabled: Boolean(channelId),
    staleTime: 60_000,
  });
}
