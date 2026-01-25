import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";

import { authService } from "./authService";
import { ensureBackendUser } from "./userService";
import { useUserStore } from "../stores/useUser";
import { User } from "../types/user";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeAuthError(error: unknown): string {
  if (!error) {
    return "Something went wrong. Please try again.";
  }
  if (typeof error === "string") {
    return error;
  }

  const message = (error as { message?: string })?.message;
  if (!message) {
    return "Something went wrong. Please try again.";
  }

  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("network request failed") || lower.includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }

  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const user = useUserStore((state) => state.user);
  const hydrated = useUserStore((state) => state.hydrated);
  const setUser = useUserStore((state) => state.setUser);
  const authHandlingRef = useRef(false);

  const handleSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession) {
        setUser(null);
        return;
      }

      try {
        const backendUser = await ensureBackendUser(nextSession);
        setUser({ ...backendUser, token: nextSession.access_token });
      } catch (error) {
        const cachedUser = useUserStore.getState().user;
        if (cachedUser) {
          setUser({ ...cachedUser, token: nextSession.access_token });
          return;
        }
        throw error;
      }
    },
    [setUser]
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let active = true;

    const restoreSession = async () => {
      try {
        const existingSession = await authService.getSession();
        if (!active) {
          return;
        }
        if (existingSession) {
          await handleSession(existingSession);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("[auth] restore session failed", error);
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    restoreSession();

    const unsubscribe = authService.onAuthStateChange(async (nextSession) => {
      if (!active) {
        return;
      }

      if (authHandlingRef.current) {
        setSession(nextSession);
        if (!nextSession) {
          setUser(null);
        }
        return;
      }

      try {
        await handleSession(nextSession);
      } catch (error) {
        if (__DEV__) {
          console.warn("[auth] session sync failed", error);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrated, handleSession, setUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      authHandlingRef.current = true;
      try {
        const nextSession = await authService.signInWithPassword(email, password);
        await handleSession(nextSession);
      } catch (error) {
        throw new Error(normalizeAuthError(error));
      } finally {
        authHandlingRef.current = false;
      }
    },
    [handleSession]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      authHandlingRef.current = true;
      try {
        const nextSession = await authService.signUpWithPassword(email, password);
        if (!nextSession) {
          throw new Error("Check your email to confirm your account, then sign in.");
        }
        await handleSession(nextSession);
      } catch (error) {
        throw new Error(normalizeAuthError(error));
      } finally {
        authHandlingRef.current = false;
      }
    },
    [handleSession]
  );

  const signInWithGoogle = useCallback(async () => {
    authHandlingRef.current = true;
    try {
      const nextSession = await authService.signInWithGoogle();
      await handleSession(nextSession);
    } catch (error) {
      throw new Error(normalizeAuthError(error));
    } finally {
      authHandlingRef.current = false;
    }
  }, [handleSession]);

  const signOut = useCallback(async () => {
    authHandlingRef.current = true;
    try {
      await authService.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      throw new Error(normalizeAuthError(error));
    } finally {
      authHandlingRef.current = false;
    }
  }, [setUser]);

  const value = useMemo(
    () => ({
      session,
      user,
      initializing,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [session, user, initializing, signIn, signUp, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

