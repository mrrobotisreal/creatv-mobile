import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../src/auth/authProvider";
import { useUserStore } from "../src/stores/useUser";

export default function Index() {
  const { session, user, initializing } = useAuth();
  const hydrated = useUserStore((state) => state.hydrated);

  if (initializing || !hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#F4F5F7" />
      </View>
    );
  }

  if (!session || !user) {
    return <Redirect href="/(auth)" />;
  }

  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0B0B10",
    alignItems: "center",
    justifyContent: "center",
  },
});
