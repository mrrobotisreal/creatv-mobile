import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const USER_API = process.env.EXPO_PUBLIC_USER_API_URL as string;

type ListChannelsResponse = {
  channels: Array<{ channel_id: number }>;
  count: number;
  page: number;
  limit: number;
  has_more: boolean;
};

async function fetchIsSubscribed(firebaseUID: string, channelId: number): Promise<boolean> {
  const url = new URL(`${USER_API}/users/${firebaseUID}/subscriptions/channels`);
  url.searchParams.set("p", "1");
  url.searchParams.set("l", "200");
  const res = await authFetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to list subscription channels (${res.status})`);
  }
  const data = (await res.json()) as ListChannelsResponse;
  return data.channels?.some((c) => Number(c.channel_id) === Number(channelId)) ?? false;
}

async function setSubscription(firebaseUID: string, channelId: number, subscribe: boolean): Promise<void> {
  const res = await authFetch(`${USER_API}/users/${firebaseUID}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, subscribe }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to update subscription");
  }
}

export function useSubscription(channelId?: number) {
  const firebaseUID = useUserStore((state) => state.user?.firebase_uid);
  const queryClient = useQueryClient();

  const enabled = Boolean(USER_API) && Boolean(firebaseUID) && typeof channelId === "number" && channelId > 0;

  const statusQuery = useQuery({
    queryKey: ["is-subscribed", firebaseUID, channelId],
    enabled,
    queryFn: () => fetchIsSubscribed(firebaseUID as string, channelId as number),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (nextSubscribe: boolean) => {
      if (!enabled) return Promise.reject(new Error("Missing user or channel"));
      return setSubscription(firebaseUID as string, channelId as number, nextSubscribe);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["is-subscribed", firebaseUID, channelId] }),
        queryClient.invalidateQueries({ queryKey: ["channel", channelId] }),
        queryClient.invalidateQueries({ queryKey: ["subscription-channels", firebaseUID] }),
      ]);
    },
  });

  const subscribe = () => mutation.mutate(true);
  const unsubscribe = () => mutation.mutate(false);
  const toggle = () => {
    const current = statusQuery.data === true;
    mutation.mutate(!current);
  };

  return useMemo(
    () => ({
      isSubscribed: statusQuery.data === true,
      isLoading: statusQuery.isLoading,
      isPending: mutation.isPending,
      canSubmit: enabled && !mutation.isPending,
      subscribe,
      unsubscribe,
      toggle,
    }),
    [enabled, mutation.isPending, statusQuery.data, statusQuery.isLoading]
  );
}
