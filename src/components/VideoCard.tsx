import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { LatestVideoItem } from "../hooks/useListLatestVideos";
import type { SubscriptionVideoItem } from "../hooks/useListSubscriptionVideos";
import { useGetWatchProgress } from "../hooks/useGetWatchProgress";
import { useUserStore } from "../stores/useUser";
import { ensurePublicBucketUrl, resolveMediaUrl } from "../utils/urls";

type VideoCardVideo = LatestVideoItem | SubscriptionVideoItem;

interface VideoCardProps {
  video: VideoCardVideo;
  onPress?: (video: VideoCardVideo) => void;
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mins}:${ss}`;
}

function formatViews(n?: number) {
  if (typeof n !== "number") return "0 views";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} ${n === 1 ? "view" : "views"}`;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  const mo = Math.floor(d / 30);
  const y = Math.floor(d / 365);
  if (y > 0) return `${y} year${y > 1 ? "s" : ""} ago`;
  if (mo > 0) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  if (w > 0) return `${w} week${w > 1 ? "s" : ""} ago`;
  if (d > 0) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (m > 0) return `${m} minute${m > 1 ? "s" : ""} ago`;
  return `${s} seconds ago`;
}

export function VideoCard({ video, onPress }: VideoCardProps) {
  const userId = useUserStore((state) => state.user?.id);
  const channel = video.channel_display_name || "Unknown";
  const channelAvatar = video.channel_avatar_url;
  const duration = useMemo(() => formatDuration(video.duration_seconds), [video.duration_seconds]);
  const durationSeconds = useMemo(() => video.duration_seconds ?? 0, [video.duration_seconds]);
  const views = useMemo(() => formatViews(video.view_count), [video.view_count]);
  const timestamp = useMemo(
    () => timeAgo(video.published_at || video.created_at),
    [video.created_at, video.published_at]
  );
  const thumbnail = video.thumbnail_url ?? "";
  const progress = useGetWatchProgress(video.watch_progress ? undefined : video.id, userId);
  const watchedPercent = useMemo(() => {
    if (!durationSeconds || durationSeconds <= 0) return 0;
    const lastPos =
      (video.watch_progress?.last_position_seconds ?? progress.data?.last_position_seconds) ?? 0;
    return Math.min(100, (lastPos / durationSeconds) * 100);
  }, [durationSeconds, progress.data?.last_position_seconds, video.watch_progress?.last_position_seconds]);

  const normalizedThumbnailUrl = useMemo(
    () => ensurePublicBucketUrl(thumbnail) ?? resolveMediaUrl(thumbnail) ?? thumbnail,
    [thumbnail]
  );
  const normalizedChannelAvatar = useMemo(
    () => ensurePublicBucketUrl(channelAvatar) ?? channelAvatar,
    [channelAvatar]
  );

  return (
    <Pressable onPress={() => onPress?.(video)} style={styles.card}>
      <View style={styles.thumbnailWrapper}>
        {normalizedThumbnailUrl ? (
          <Image source={{ uri: normalizedThumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailFallback} />
        )}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(watchedPercent, 0)}%` }]} />
        </View>
        <View style={styles.durationPill}>
          <Text style={styles.durationText}>{duration}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.avatar}>
          {normalizedChannelAvatar ? (
            <Image source={{ uri: normalizedChannelAvatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarFallbackText}>{channel.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.metaText}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {channel}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {views} • {timestamp}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const COLORS = {
  bg: "#0B0B10",
  text: "#F4F5F7",
  muted: "rgba(244,245,247,0.65)",
  overlay: "rgba(0,0,0,0.75)",
  border: "rgba(255,255,255,0.08)",
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: COLORS.bg,
  },
  thumbnailWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailFallback: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF7F50",
  },
  durationPill: {
    position: "absolute",
    right: 8,
    bottom: 8,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarFallbackText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  metaText: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12.5,
  },
});
