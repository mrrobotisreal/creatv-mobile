import { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "./supabaseClient";

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = "creatv://login-callback";

export interface AuthService {
  getSession: () => Promise<Session | null>;
  onAuthStateChange: (handler: (session: Session | null) => void) => () => void;
  signInWithPassword: (email: string, password: string) => Promise<Session>;
  signUpWithPassword: (email: string, password: string) => Promise<Session | null>;
  signInWithGoogle: () => Promise<Session>;
  signOut: () => Promise<void>;
}

function parseOAuthUrl(url: string) {
  const callbackUrl = new URL(url);
  const code = callbackUrl.searchParams.get("code");
  if (code) {
    return { code };
  }

  const hash = callbackUrl.hash?.replace(/^#/, "");
  if (!hash) {
    return {};
  }
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token") ?? undefined,
    refreshToken: params.get("refresh_token") ?? undefined,
  };
}

async function exchangeForSession(url: string): Promise<Session | null> {
  const { code, accessToken, refreshToken } = parseOAuthUrl(url);
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return data.session;
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return data.session;
  }

  return null;
}

export const authService: AuthService = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data.session ?? null;
  },
  onAuthStateChange(handler) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handler(session);
    });
    return () => data.subscription.unsubscribe();
  },
  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    if (!data.session) {
      throw new Error("Unable to create a session. Please try again.");
    }
    return data.session;
  },
  async signUpWithPassword(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: REDIRECT_URI,
      },
    });
    if (error) {
      throw error;
    }
    return data.session ?? null;
  },
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: REDIRECT_URI,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      throw error ?? new Error("Unable to start Google sign-in.");
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI);
    if (result.type !== "success" || !result.url) {
      throw new Error("Sign-in cancelled.");
    }

    const session = await exchangeForSession(result.url);
    if (!session) {
      throw new Error("Unable to complete Google sign-in.");
    }
    return session;
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },
};

