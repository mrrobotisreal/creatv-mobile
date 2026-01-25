import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

const COLORS = {
  bg: "#0B0B10",
  text: "#F4F5F7",
  muted: "rgba(244,245,247,0.65)",
};

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Welcome to CreaTV.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 8,
  },
});

