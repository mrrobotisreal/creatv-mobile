import { authFetch } from "../auth/authFetch";
import { CreateShareLinkRequest, CreateShareLinkResponse } from "../types/share_links";

const BASE_URL = process.env.EXPO_PUBLIC_SHARING_API_URL as string | undefined;

function requireBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_SHARING_API_URL");
  }
  return BASE_URL;
}

export async function createShareLink(req: CreateShareLinkRequest): Promise<CreateShareLinkResponse> {
  const url = `${requireBaseUrl()}/share-links`;
  const res = await authFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to create share link");
  }
  return (await res.json()) as CreateShareLinkResponse;
}
