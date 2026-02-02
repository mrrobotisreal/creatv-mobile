import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const BASE_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL as string;

type PostCommentInput = {
  content: string;
  parentCommentId?: number;
  media?: CommentMediaInput[];
};

export type CommentMediaInput = {
  s3_key: string;
  content_type: string;
  file_size_bytes: number;
  width?: number | null;
  height?: number | null;
  is_animated: boolean;
  sort_order: number;
};

async function postComment(videoId: number | string, userId: number, input: PostCommentInput) {
  const body = {
    user_id: userId,
    content: input.content,
    parent_comment_id: input.parentCommentId ?? null,
    media: input.media ?? [],
  };
  const res = await authFetch(`${BASE_URL}/videos/${videoId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to post comment");
  }
  return (await res.json()) as { id: number };
}

export function usePostComment(videoId?: number | string) {
  const queryClient = useQueryClient();
  const userId = useUserStore((state) => state.user?.id);
  const numericUserId = useMemo(() => {
    if (!userId) return undefined;
    const n = Number(userId);
    return Number.isFinite(n) ? n : undefined;
  }, [userId]);

  return useMutation({
    mutationFn: (input: PostCommentInput) => {
      if (!BASE_URL || !videoId || !numericUserId) {
        return Promise.reject(new Error("Missing API URL, videoId, or user"));
      }
      return postComment(videoId, numericUserId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] });
    },
  });
}
