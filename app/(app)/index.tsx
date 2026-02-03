import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useListLatestVideos, type LatestVideoItem } from "../../src/hooks/useListLatestVideos";
import { VideoCard } from "../../src/components/VideoCard";
import { GradientText } from "../../src/components/GradientText";
import { useUserStore } from "../../src/stores/useUser";

type GradientColors = readonly [string, string, ...string[]];

function isValidComponent(component: unknown) {
  if (typeof component === "function") {
    return true;
  }
  if (typeof component === "object" && component !== null && "$$typeof" in (component as object)) {
    return true;
  }
  return false;
}

export default function HomeScreen() {
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const { videos, isLoading, isRefreshing, isFetchingMore, hasMore, error, refresh, fetchNextPage } =
    useListLatestVideos(40);
  const ListComponent: React.ComponentType<any> = isValidComponent(FlashList) ? (FlashList as any) : FlatList;

  const renderItem = useCallback(({ item }: { item: LatestVideoItem }) => {
    return (
      <VideoCard
        video={item}
        onPress={() => router.push({ pathname: "/video/[id]", params: { id: String(item.id) } })}
      />
    );
  }, [router]);

  const listFooter = useMemo(() => {
    if (!isFetchingMore) {
      return <View style={styles.footerSpacer} />;
    }
    return (
      <View style={styles.footerLoading}>
        <Text style={styles.footerText}>Loading more videos...</Text>
      </View>
    );
  }, [isFetchingMore]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topNav}>
        <View style={styles.brandRow}>
          <Image source={require("../../assets/logo.png")} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.brandTextRow}>
            <GradientText text="Crea" colors={GRADIENTS.crea} style={styles.brandText} numberOfLines={1} ellipsizeMode="clip" />
            <GradientText text="TV" colors={GRADIENTS.tv} style={styles.brandText} numberOfLines={1} ellipsizeMode="clip" />
            {/* {user?.is_premium ? (
              <View style={styles.premiumBadge}>
                <GradientText text="P" colors={GRADIENTS.premium} style={styles.premiumText} numberOfLines={1} ellipsizeMode="clip" />
              </View>
            ) : null} */}
          </View>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={18} color={COLORS.text} />
          </View>
        </View>
      </View>

      <View style={styles.listContainer}>
        <ListComponent
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item: LatestVideoItem) => item.id.toString()}
          onEndReached={() => {
            if (hasMore) {
              void fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          refreshing={isRefreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            isLoading ? (
              <Text style={styles.loadingText}>Loading videos...</Text>
            ) : (
              <Text style={styles.loadingText}>{error ?? "No videos yet."}</Text>
            )
          }
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: "#0B0B10",
  text: "#F4F5F7",
  muted: "rgba(244,245,247,0.65)",
  border: "rgba(255,255,255,0.08)",
  input: "#14141B",
};

const GRADIENTS: { crea: GradientColors; tv: GradientColors; premium: GradientColors } = {
  crea: ["hsl(265 83% 57%)", "hsl(203 92% 75%)"],
  tv: ["hsl(24 96% 55%)", "hsl(63 100% 73%)"],
  premium: ["hsl(145 100% 69%)", "hsl(145 88% 33%)"],
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topNav: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  brandLogo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  brandTextRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    flexShrink: 0,
  },
  brandText: {
    fontFamily: "RubikGlitch",
    fontSize: 22,
    color: COLORS.text,
    flexWrap: "nowrap",
  },
  premiumBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.8)",
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumText: {
    fontFamily: "PermanentMarker",
    fontSize: 10,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  gradientMask: {
    color: "#fff",
  },
  gradientHidden: {
    opacity: 0,
  },
  gradientContainer: {
    alignSelf: "flex-start",
  },
  gradientFallback: {
    color: COLORS.text,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.input,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 14,
    paddingRight: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  searchIcon: {
    width: 28,
    alignItems: "flex-end",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 96,
  },
  loadingText: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 40,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 12.5,
  },
  footerSpacer: {
    height: 16,
  },
});

