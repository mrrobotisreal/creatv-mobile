import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../src/auth/authProvider";
import { useUserStore } from "../src/stores/useUser";

const COLORS = {
  bg: "#0B0B10",
  text: "#F4F5F7",
};

export default function LoginCallbackScreen() {
  const router = useRouter();
  const { session, user, initializing } = useAuth();
  const hydrated = useUserStore((state) => state.hydrated);

  useEffect(() => {
    if (initializing || !hydrated) {
      return;
    }
    if (session && user) {
      router.replace("/(app)");
    } else {
      router.replace("/(auth)");
    }
  }, [hydrated, initializing, router, session, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
});

