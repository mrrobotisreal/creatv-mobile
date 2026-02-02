import { useQuery } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const USER_API = process.env.EXPO_PUBLIC_USER_API_URL as string;

export type SubscriptionChannel = {
  channel_id: number;
  display_name: string;
  avatar_url?: string | null;
};

export type ListSubscriptionsResponse = {
  channels: SubscriptionChannel[];
  count: number;
  page: number;
  limit: number;
  has_more: boolean;
};

export function useListSubscriptionChannels(limit = 200) {
  const firebaseUID = useUserStore((state) => state.user?.firebase_uid);

  return useQuery<ListSubscriptionsResponse>({
    queryKey: ["subscription-channels", firebaseUID, limit],
    enabled: Boolean(USER_API) && Boolean(firebaseUID),
    queryFn: async () => {
      if (!USER_API || !firebaseUID) {
        throw new Error("Missing API URL or user");
      }
      const url = new URL(`${USER_API}/users/${firebaseUID}/subscriptions/channels`);
      url.searchParams.set("p", "1");
      url.searchParams.set("l", String(limit));
      const res = await authFetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to list subscription channels (${res.status})`);
      }
      return (await res.json()) as ListSubscriptionsResponse;
    },
    staleTime: 60_000,
  });
}
