import { Session } from "@supabase/supabase-js";

import { authFetch } from "./authFetch";
import { User } from "../types/user";

const USER_API_URL = process.env.EXPO_PUBLIC_USER_API_URL;

if (!USER_API_URL) {
  throw new Error("Missing EXPO_PUBLIC_USER_API_URL in env.");
}

const API_BASE = USER_API_URL.replace(/\/$/, "");

function resolveDisplayName(session: Session) {
  const metadata = session.user.user_metadata ?? {};
  const email = session.user.email ?? "";
  return (
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    (email ? email.split("@")[0] : "Creator")
  );
}

async function parseUserResponse(response: Response): Promise<User> {
  const data = (await response.json()) as User;
  return data;
}

export async function ensureBackendUser(session: Session): Promise<User> {
  const firebaseUid = session.user.id;
  const email = session.user.email ?? "";
  const displayName = resolveDisplayName(session);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };

  let userResponse = await authFetch(`${API_BASE}/users/${firebaseUid}`, { headers });

  if (userResponse.status === 404) {
    const createPayload = {
      firebase_uid: firebaseUid,
      email,
      display_name: displayName,
      is_premium: false,
      date_of_birth: null,
      user_agreed_to_terms: true,
      user_agreed_to_privacy: true,
      user_agreed_to_emails: false,
      country_code: null,
    };

    userResponse = await authFetch(`${API_BASE}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify(createPayload),
    });
  }

  if (!userResponse.ok) {
    throw new Error("Unable to load your profile. Please try again.");
  }

  const user = await parseUserResponse(userResponse);

  void authFetch(`${API_BASE}/users/${firebaseUid}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ last_login_at: new Date().toISOString() }),
  }).catch(() => undefined);

  return user;
}

