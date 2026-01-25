import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

const COLORS = {
  bg: "#0B0B10",
  text: "#F4F5F7",
};

export default function LoginCallbackScreen() {
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

