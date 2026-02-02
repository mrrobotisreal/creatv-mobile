import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "../src/auth/authProvider";
import { useUserStore } from "../src/stores/useUser";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { session, user, initializing } = useAuth();
  const hydrated = useUserStore((state) => state.hydrated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing || !hydrated) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";

    if (!session || !user) {
      if (!inAuthGroup) {
        router.replace("/(auth)");
      }
      return;
    }

    if (!inAppGroup) {
      router.replace("/(app)");
    }
  }, [hydrated, initializing, segments, router, session, user]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      })
  );
  const [fontsLoaded] = useFonts({
    RubikGlitch: require("../assets/fonts/Rubik_Glitch/RubikGlitch-Regular.ttf"),
    PermanentMarker: require("../assets/fonts/Permanent_Marker/PermanentMarker-Regular.ttf"),
  });

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    const onAppStateChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === "active");
    };
    const appStateSub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      unsubscribeNetInfo();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
