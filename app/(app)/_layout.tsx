import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUserStore } from "../../src/stores/useUser";

function UserAvatarIcon({ focused, size }: { focused: boolean; size: number }) {
  const user = useUserStore((state) => state.user);
  const uri = user?.profile_picture_url ?? undefined;
  const label =
    user?.display_name?.charAt(0) ||
    user?.username?.charAt(0) ||
    user?.email?.charAt(0) ||
    "U";
  const dimension = Math.max(size, 24);

  return (
    <View style={[styles.avatarWrapper, { width: dimension, height: dimension }, focused && styles.avatarFocused]}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarFallback}>{label.toUpperCase()}</Text>
      )}
    </View>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F4F5F7",
        tabBarInactiveTintColor: "rgba(244,245,247,0.6)",
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + insets.bottom,
            paddingBottom: Math.max(8, insets.bottom),
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Subscriptions",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "albums" : "albums-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ size, focused }) => <UserAvatarIcon size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="video/[id]"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#0B0B10",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  avatarWrapper: {
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  avatarFocused: {
    borderWidth: 2,
    borderColor: "rgba(244,245,247,0.9)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarFallback: {
    color: "#F4F5F7",
    fontSize: 10,
    fontWeight: "700",
  },
});
