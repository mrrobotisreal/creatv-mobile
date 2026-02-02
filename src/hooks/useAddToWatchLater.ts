import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../auth/authFetch";
import { useUserStore } from "../stores/useUser";

const USER_API = process.env.EXPO_PUBLIC_USER_API_URL as string;

type WatchLaterMutationResponse = {
  playlist_id: number;
  video_id: number;
  added: boolean;
  message?: string;
};

export function useAddToWatchLater() {
  const firebaseUID = useUserStore((state) => state.user?.firebase_uid);
  const queryClient = useQueryClient();

  return useMutation<WatchLaterMutationResponse, Error, number>({
    mutationKey: ["watch-later-add", firebaseUID],
    mutationFn: async (videoId: number) => {
      if (!USER_API || !firebaseUID) {
        throw new Error("You must be signed in to save videos.");
      }
      if (!videoId || videoId <= 0) {
        throw new Error("Invalid video.");
      }
      const res = await authFetch(`${USER_API}/users/${firebaseUID}/playlists/later`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to save video (${res.status})`);
      }
      return (await res.json()) as WatchLaterMutationResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-later", firebaseUID] });
      queryClient.invalidateQueries({ queryKey: ["watch-later-membership", firebaseUID], exact: false });
    },
  });
}
