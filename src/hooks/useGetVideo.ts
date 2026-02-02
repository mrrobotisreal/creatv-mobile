import { useQuery } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";

export interface TopicRef {
  id: number;
  name?: string | null;
  category_id?: number | null;
}

export interface CategoryRef {
  id: number;
  name?: string | null;
}

export interface Video {
  id: number;
  user_id: number;
  channel_id: number;
  title: string;
  description?: string | null;
  duration_seconds: number;
  original_file_key?: string | null;
  hls_master_playlist_key?: string | null;
  premium_dash_manifest_key?: string | null;
  premium_dash_storage_path?: string | null;
  captions_vtt_key?: string | null;
  streaming_protocol: string;
  hls_storage_path?: string | null;
  default_language?: string | null;
  processing_status: string;
  processing_error?: string | null;
  thumbnail_url?: string | null;
  original_width?: number | null;
  original_height?: number | null;
  original_size_bytes?: number | null;
  processed_size_bytes?: number | null;
  visibility: string;
  scheduled_publish_at?: string | null;
  is_made_for_kids: boolean;
  is_age_restricted: boolean;
  is_comments_enabled: boolean;
  is_monetized: boolean;
  view_count: number;
  unique_view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  tags?: string | null;
  links?: string[] | null;
  chapters?: string[] | null;
  format_tags?: string[] | null;
  language?: string | null;
  published_at?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  additional_categories?: CategoryRef[] | null;
  main_category_id?: number | null;
  main_category_name?: string | null;
  main_topic_id?: number | null;
  main_topic_name?: string | null;
  additional_topics?: TopicRef[] | null;
  storyboard?: {
    base_path: string;
    vtt_key?: string | null;
    interval_seconds: number;
    tile_width: number;
    tile_height: number;
    columns: number;
    rows: number;
    sprite_count: number;
  } | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

const BASE_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL as string;

async function fetchVideo(id: string | number): Promise<Video> {
  const res = await authFetch(`${BASE_URL}/videos/${id}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch video ${id}`);
  }
  return res.json();
}

export function useGetVideo(id?: string | number) {
  return useQuery({
    queryKey: ["video", id],
    queryFn: () => fetchVideo(id as string | number),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
