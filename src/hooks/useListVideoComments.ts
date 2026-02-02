import { useQuery } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";

const BASE_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL as string;

export type VideoComment = {
  id: number;
  user_id: number;
  content: string;
  like_count: number;
  reply_count: number;
  is_pinned: boolean;
  is_creator_reply: boolean;
  is_hidden: boolean;
  hidden_reason?: string;
  country_code?: string | null;
  created_at: string;
  updated_at: string;
  media?: CommentMedia[];
  reaction_counts?: Record<string, number>;
  viewer_reaction?: string | null;
};

export type CommentMedia = {
  id: number;
  comment_id: number;
  uploader_user_id: number;
  sort_order: number;
  media_type: string;
  s3_bucket: string;
  s3_key: string;
  content_type: string;
  file_size_bytes: number;
  width?: number | null;
  height?: number | null;
  is_animated: boolean;
  moderation_status: string;
  moderation_reason?: string | null;
  created_at: string;
};

export type ListCommentsResponse = {
  comments: VideoComment[];
};

export function useListVideoComments(
  videoId?: number | string,
  options?: { parentCommentId?: number; limit?: number; offset?: number; viewerUserId?: number }
) {
  return useQuery<ListCommentsResponse>({
    queryKey: ["video-comments", videoId, options?.parentCommentId, options?.limit, options?.offset, options?.viewerUserId],
    enabled: Boolean(BASE_URL) && Boolean(videoId),
    queryFn: async () => {
      if (!BASE_URL || !videoId) {
        throw new Error("Missing API URL or videoId");
      }
      const url = new URL(`${BASE_URL}/videos/${videoId}/comments`);
      if (options?.parentCommentId) {
        url.searchParams.set("parent_comment_id", String(options.parentCommentId));
      }
      if (options?.limit) url.searchParams.set("limit", String(options.limit));
      if (options?.offset) url.searchParams.set("offset", String(options.offset));
      if (options?.viewerUserId) url.searchParams.set("viewer_user_id", String(options.viewerUserId));
      const res = await authFetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to list comments (${res.status})`);
      }
      return (await res.json()) as ListCommentsResponse;
    },
    staleTime: 10_000,
  });
}
