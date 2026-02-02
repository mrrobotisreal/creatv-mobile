import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserStore } from "../../src/stores/useUser";

export default function YouScreen() {
  const user = useUserStore((state) => state.user);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          {user?.profile_picture_url ? (
            <Image source={{ uri: user.profile_picture_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarFallback}>{user?.display_name?.charAt(0) ?? "Y"}</Text>
          )}
        </View>
        <Text style={styles.title}>You</Text>
        <Text style={styles.subtitle}>Profile settings will land here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0B10",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarFallback: {
    color: "#F4F5F7",
    fontSize: 18,
    fontWeight: "700",
  },
  title: {
    color: "#F4F5F7",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(244,245,247,0.65)",
  },
});
