import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

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
  const [fontsLoaded] = useFonts({
    RubikGlitch: require("../assets/fonts/Rubik_Glitch/RubikGlitch-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
