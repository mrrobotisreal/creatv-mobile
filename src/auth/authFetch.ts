import { supabase } from "./supabaseClient";
import { useUserStore } from "../stores/useUser";

async function resolveAccessToken(): Promise<string | null> {
  const state = useUserStore.getState();
  const existingToken = state.user?.token;
  if (existingToken) {
    return existingToken;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    const sessionToken = data.session?.access_token ?? null;
    if (sessionToken) {
      const currentUser = state.user;
      if (currentUser) {
        state.setUser({ ...currentUser, token: sessionToken });
      }
    }
    return sessionToken;
  } catch {
    return null;
  }
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const existingHeaders = new Headers(init?.headers ?? {});
  const hasAuthHeader = existingHeaders.has("Authorization") || existingHeaders.has("authorization");
  const headers = hasAuthHeader ? existingHeaders : new Headers(existingHeaders);

  if (!hasAuthHeader) {
    const token = await resolveAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

