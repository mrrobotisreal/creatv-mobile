import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const BASE_URL = process.env.EXPO_PUBLIC_VIDEOMETADATA_API_URL as string;

type ReactionType = "like" | "dislike" | null;

interface GetReactionsResponse {
  like_count: number;
  dislike_count: number;
  user_reaction?: "like" | "dislike" | null;
}

async function setVideoReaction(videoId: number | string, userId: number, reaction: ReactionType) {
  const body: { user_id: number; reaction_type: ReactionType } = {
    user_id: userId,
    reaction_type: reaction,
  };
  const res = await authFetch(`${BASE_URL}/videos/${videoId}/reactions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to set reaction");
  }
}

async function fetchReactions(videoId: number | string, userId?: number): Promise<GetReactionsResponse> {
  const url = new URL(`${BASE_URL}/videos/${videoId}/reactions`);
  if (userId && userId > 0) url.searchParams.set("user_id", String(userId));
  const res = await authFetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch reactions");
  }
  return (await res.json()) as GetReactionsResponse;
}

export function useReactToVideo(videoId?: number | string) {
  const queryClient = useQueryClient();
  const userId = useUserStore((state) => state.user?.id);
  const numericUserId = useMemo(() => {
    if (!userId) return undefined;
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [userId]);

  const reactionsQuery = useQuery({
    queryKey: ["video-reactions", videoId, numericUserId],
    enabled: Boolean(videoId) && Boolean(BASE_URL),
    queryFn: () => fetchReactions(videoId as number | string, numericUserId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (reaction: ReactionType) => {
      if (!videoId || !numericUserId) {
        return Promise.reject(new Error("Missing videoId or userId"));
      }
      return setVideoReaction(videoId, numericUserId, reaction);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["video-reactions", videoId, numericUserId] }),
        queryClient.invalidateQueries({ queryKey: ["video", String(videoId)] }),
      ]);
    },
  });

  const like = () => {
    const current = reactionsQuery.data?.user_reaction ?? null;
    const next: ReactionType = current === "like" ? null : "like";
    mutation.mutate(next);
  };
  const dislike = () => {
    const current = reactionsQuery.data?.user_reaction ?? null;
    const next: ReactionType = current === "dislike" ? null : "dislike";
    mutation.mutate(next);
  };
  const remove = () => mutation.mutate(null);

  return {
    like,
    dislike,
    remove,
    isPending: mutation.isPending,
    userReaction: reactionsQuery.data?.user_reaction ?? null,
    likeCount: reactionsQuery.data?.like_count,
    dislikeCount: reactionsQuery.data?.dislike_count,
    canReact: Boolean(numericUserId) && Boolean(videoId),
  };
}
