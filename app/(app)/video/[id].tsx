import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Video, {
  SelectedVideoTrackType,
  type OnLoadData,
  type OnProgressData,
  type SelectedVideoTrack,
  type VideoRef,
} from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { useGetVideo } from "../../../src/hooks/useGetVideo";
import { useGetChannel } from "../../../src/hooks/useGetChannel";
import { useReactToVideo } from "../../../src/hooks/useReactToVideo";
import { useAddToWatchLater } from "../../../src/hooks/useAddToWatchLater";
import { useRemoveFromWatchLater } from "../../../src/hooks/useRemoveFromWatchLater";
import { useIsVideoInWatchLater } from "../../../src/hooks/useIsVideoInWatchLater";
import { useSubscription } from "../../../src/hooks/useSubscription";
import { useListVideoComments } from "../../../src/hooks/useListVideoComments";
import { usePostComment } from "../../../src/hooks/usePostComment";
import { useCreateShareLink } from "../../../src/hooks/useCreateShareLink";
import { useParseChapters } from "../../../src/hooks/useParseChapters";
import { useUserStore } from "../../../src/stores/useUser";
import { ensurePublicBucketUrl, resolveMediaUrl } from "../../../src/utils/urls";
import {
  formatCount,
  formatRelativeTime,
  formatShareTimestamp,
  formatViews,
  parseShareTimestampInput,
} from "../../../src/utils/format";
import { DashEngine } from "../../../src/lib/player/engine/DashEngine";
import { HlsEngine } from "../../../src/lib/player/engine/HlsEngine";
import { FileEngine } from "../../../src/lib/player/engine/FileEngine";
import type { EngineQualityOption, PlaybackCandidate } from "../../../src/lib/player/engine/IPlaybackEngine";
import { SHARE_SURFACE_MOBILE_VIDEO_PLAYER, type ShareTarget } from "../../../src/types/share_links";

const DEFAULT_QUALITY_OPTION: EngineQualityOption = { id: "auto", label: "Auto", requiresPremium: false };

const PLAYBACK_SPEED_OPTIONS = [
  { label: "0.25x", value: 0.25 },
  { label: "0.5x", value: 0.5 },
  { label: "0.75x", value: 0.75 },
  { label: "Normal", value: 1 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "1.75x", value: 1.75 },
  { label: "2x", value: 2 },
] as const;

const SLEEP_TIMER_OPTIONS = [
  { label: "Off", minutes: 0 },
  { label: "5 minutes", minutes: 5 },
  { label: "10 minutes", minutes: 10 },
  { label: "15 minutes", minutes: 15 },
  { label: "20 minutes", minutes: 20 },
  { label: "30 minutes", minutes: 30 },
  { label: "45 minutes", minutes: 45 },
  { label: "1 hour", minutes: 60 },
] as const;

const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://creatv.io").trim();
const SHARING_API_URL = process.env.EXPO_PUBLIC_SHARING_API_URL as string | undefined;

const SHARE_TARGETS: Array<{ id: ShareTarget; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "copy", label: "Copy", icon: "copy-outline" },
  { id: "email", label: "Email", icon: "mail-outline" },
  { id: "sms", label: "SMS", icon: "chatbubble-outline" },
  { id: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
  { id: "telegram", label: "Telegram", icon: "paper-plane-outline" },
  { id: "x", label: "X", icon: "logo-twitter" },
  { id: "facebook", label: "Facebook", icon: "logo-facebook" },
  { id: "linkedin", label: "LinkedIn", icon: "logo-linkedin" },
  { id: "instagram", label: "Instagram", icon: "logo-instagram" },
  { id: "other", label: "More", icon: "share-outline" },
];

function buildMediaUrl(value?: string | null) {
  if (!value) return undefined;
  const normalized = ensurePublicBucketUrl(value) ?? value;
  return resolveMediaUrl(normalized) ?? normalized;
}

export default function VideoPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const videoId = idParam ? String(idParam) : undefined;
  const user = useUserStore((state) => state.user);
  const isPremiumViewer = Boolean(user?.is_premium);
  const numericUserId = useMemo(() => {
    if (!user?.id) return undefined;
    const n = Number(user.id);
    return Number.isFinite(n) ? n : undefined;
  }, [user?.id]);

  const videoQuery = useGetVideo(videoId);
  const video = videoQuery.data;
  const channelQuery = useGetChannel(video?.channel_id);
  const channel = channelQuery.data;

  const reactions = useReactToVideo(video?.id);
  const watchLaterQuery = useIsVideoInWatchLater(video?.id);
  const addToWatchLater = useAddToWatchLater();
  const removeFromWatchLater = useRemoveFromWatchLater();
  const subscription = useSubscription(video?.channel_id ?? undefined);
  const commentsQuery = useListVideoComments(video?.id, { limit: 200, offset: 0, viewerUserId: numericUserId });
  const postComment = usePostComment(video?.id);
  const createShareLink = useCreateShareLink();

  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [volumeTrackWidth, setVolumeTrackWidth] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"root" | "playback" | "quality" | "sleep">("root");
  const [qualityOptions, setQualityOptions] = useState<EngineQualityOption[]>([DEFAULT_QUALITY_OPTION]);
  const [selectedQualityId, setSelectedQualityId] = useState(DEFAULT_QUALITY_OPTION.id);
  const [selectedVideoTrack, setSelectedVideoTrack] = useState<SelectedVideoTrack>({
    type: SelectedVideoTrackType.AUTO,
  });
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionCanExpand, setDescriptionCanExpand] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareIncludeTimestamp, setShareIncludeTimestamp] = useState(false);
  const [shareTimestampSeconds, setShareTimestampSeconds] = useState(0);
  const [shareTimestampInput, setShareTimestampInput] = useState("0:00");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");

  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerDeadlineRef = useRef<number | null>(null);
  const [sleepTimerLabel, setSleepTimerLabel] = useState("Off");
  const [sleepTimerRemainingMs, setSleepTimerRemainingMs] = useState<number | null>(null);

  const videoRef = useRef<VideoRef | null>(null);
  const engineRef = useRef<DashEngine | HlsEngine | FileEngine | null>(null);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const hasNativeVideo = useMemo(
    () => Boolean(typeof UIManager?.getViewManagerConfig === "function" && UIManager.getViewManagerConfig("RCTVideo")),
    []
  );
  const handleNavigateBack = useCallback(() => {
    setPaused(true);
    router.back();
  }, [router]);
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 120 && gesture.vy > 0.4) {
            handleNavigateBack();
          }
        },
      }),
    [handleNavigateBack]
  );

  const hlsMasterKey = useMemo(() => {
    if (video?.hls_master_playlist_key) return video.hls_master_playlist_key;
    if (video?.hls_storage_path) {
      const trimmed = video.hls_storage_path.replace(/\/+$/, "");
      return trimmed ? `${trimmed}/master.m3u8` : undefined;
    }
    return undefined;
  }, [video?.hls_master_playlist_key, video?.hls_storage_path]);

  const dashUrl = useMemo(() => buildMediaUrl(video?.premium_dash_manifest_key), [video?.premium_dash_manifest_key]);
  const hlsUrl = useMemo(() => buildMediaUrl(hlsMasterKey), [hlsMasterKey]);
  const fileUrl = useMemo(() => buildMediaUrl(video?.original_file_key), [video?.original_file_key]);
  const thumbnailUrl = useMemo(() => buildMediaUrl(video?.thumbnail_url), [video?.thumbnail_url]);

  const playbackCandidates = useMemo<PlaybackCandidate[]>(() => {
    const candidates: PlaybackCandidate[] = [];
    if (Platform.OS === "android") {
      if (dashUrl) candidates.push({ mode: "dash", url: dashUrl, type: "mpd" });
      if (hlsUrl) candidates.push({ mode: "hls", url: hlsUrl, type: "m3u8" });
    } else {
      if (hlsUrl) candidates.push({ mode: "hls", url: hlsUrl, type: "m3u8" });
    }
    if (fileUrl) candidates.push({ mode: "file", url: fileUrl, type: "mp4" });
    return candidates;
  }, [dashUrl, fileUrl, hlsUrl]);

  const candidate = playbackCandidates[candidateIndex];

  const chapters = useParseChapters(video?.description ?? "", { durationSeconds: video?.duration_seconds });

  useEffect(() => {
    setCandidateIndex(0);
    setPlaybackError(null);
  }, [video?.id, dashUrl, fileUrl, hlsUrl]);

  useEffect(() => {
    if (!candidate) return;
    engineRef.current?.destroy();
    const engine =
      candidate.mode === "dash" ? new DashEngine() : candidate.mode === "hls" ? new HlsEngine() : new FileEngine();
    engineRef.current = engine;
    engine.load({
      isPremiumViewer,
      onQualities: ({ options, selectedId }) => {
        setQualityOptions(options);
        setSelectedQualityId(selectedId);
      },
      onSelectedQualityChanged: setSelectedQualityId,
      onSelectedVideoTrack: setSelectedVideoTrack,
    });
    setSelectedVideoTrack({ type: SelectedVideoTrackType.AUTO });
  }, [candidate?.mode, candidate?.url, isPremiumViewer]);

  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPaused(true);
      };
    }, [])
  );

  const handleVideoLoad = useCallback(
    (data: OnLoadData) => {
      engineRef.current?.handleTracks(data.videoTracks);
    },
    []
  );

  const handleVideoProgress = useCallback((data: OnProgressData) => {
    if (typeof data.currentTime === "number") {
      setCurrentTime(data.currentTime);
    }
  }, []);

  const handleVideoError = useCallback(() => {
    if (candidateIndex + 1 < playbackCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
      return;
    }
    setPlaybackError("Playback failed. Please try again later.");
  }, [candidateIndex, playbackCandidates.length]);

  const togglePlay = useCallback(() => {
    setPaused((prev) => !prev);
  }, []);

  const handleQualitySelect = useCallback(
    (option: EngineQualityOption) => {
      if (option.requiresPremium && !isPremiumViewer) {
        Alert.alert(
          "Unlock 4K streaming",
          "To view this video in 4K, check out CreaTV Premium. Its only $11.99 a month!"
        );
        return;
      }
      engineRef.current?.setQuality(option.id);
      setSettingsView("root");
    },
    [isPremiumViewer]
  );

  const clearSleepTimerHandles = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }
    sleepTimerDeadlineRef.current = null;
    setSleepTimerRemainingMs(null);
  }, []);

  const handleSleepTimerSelect = useCallback(
    (minutes: number, label: string) => {
      clearSleepTimerHandles();
      if (minutes <= 0) {
        setSleepTimerLabel("Off");
        setSettingsView("root");
        return;
      }
      const ms = minutes * 60 * 1000;
      const deadline = Date.now() + ms;
      sleepTimerDeadlineRef.current = deadline;
      setSleepTimerLabel(label);
      setSleepTimerRemainingMs(ms);
      sleepTimerRef.current = setTimeout(() => {
        setPaused(true);
        clearSleepTimerHandles();
        setSleepTimerLabel("Off");
      }, ms);
      sleepTimerIntervalRef.current = setInterval(() => {
        if (!sleepTimerDeadlineRef.current) return;
        const remaining = sleepTimerDeadlineRef.current - Date.now();
        if (remaining <= 0) {
          setSleepTimerRemainingMs(0);
          if (sleepTimerIntervalRef.current) {
            clearInterval(sleepTimerIntervalRef.current);
            sleepTimerIntervalRef.current = null;
          }
          return;
        }
        setSleepTimerRemainingMs(remaining);
      }, 1000);
      setSettingsView("root");
    },
    [clearSleepTimerHandles]
  );

  const sleepTimerBadgeText = useMemo(() => {
    if (sleepTimerRemainingMs == null) return sleepTimerLabel;
    const minutes = Math.max(0, Math.ceil(sleepTimerRemainingMs / 60000));
    if (minutes <= 0) return "Done";
    return `${minutes} min`;
  }, [sleepTimerLabel, sleepTimerRemainingMs]);

  const handleToggleWatchLater = useCallback(async () => {
    if (!video?.id) return;
    if (!user) {
      Alert.alert("Please sign in", "Sign in to manage Watch Later.");
      return;
    }
    try {
      if (watchLaterQuery.data) {
        await removeFromWatchLater.mutateAsync(video.id);
      } else {
        await addToWatchLater.mutateAsync(video.id);
      }
    } catch (error) {
      Alert.alert("Watch Later failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [addToWatchLater, removeFromWatchLater, user, video?.id, watchLaterQuery.data]);

  const handleToggleLike = useCallback(() => {
    if (!user) {
      Alert.alert("Please sign in", "Sign in to like videos.");
      return;
    }
    reactions.like();
  }, [reactions, user]);

  const handleToggleDislike = useCallback(() => {
    if (!user) {
      Alert.alert("Please sign in", "Sign in to dislike videos.");
      return;
    }
    reactions.dislike();
  }, [reactions, user]);

  const handleSubscribeToggle = useCallback(() => {
    if (!user) {
      Alert.alert("Please sign in", "Sign in to manage subscriptions.");
      return;
    }
    subscription.toggle();
  }, [subscription, user]);

  const handleCommentSubmit = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (!user) {
      Alert.alert("Please sign in", "Sign in to comment.");
      return;
    }
    if (trimmed.toLowerCase().includes("http://") || trimmed.toLowerCase().includes("https://")) {
      Alert.alert("Links not allowed", "Please remove http/https links before posting.");
      return;
    }
    try {
      await postComment.mutateAsync({ content: trimmed });
      setCommentText("");
    } catch (error) {
      Alert.alert("Comment failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [commentText, postComment, user]);

  const handleShareTimestampToggle = useCallback(
    (next: boolean) => {
      setShareIncludeTimestamp(next);
      if (next) {
        const nextSeconds = Math.max(0, Math.floor(currentTime));
        setShareTimestampSeconds(nextSeconds);
        setShareTimestampInput(formatShareTimestamp(nextSeconds));
      }
    },
    [currentTime]
  );

  const handleShareTimestampInput = useCallback((value: string) => {
    setShareTimestampInput(value);
    const parsed = parseShareTimestampInput(value);
    if (parsed != null) {
      setShareTimestampSeconds(parsed);
    }
  }, []);

  const buildShareLink = useCallback(
    async (target: ShareTarget) => {
      if (!video?.id) {
        throw new Error("Missing video id");
      }
      const startSeconds =
        shareIncludeTimestamp && shareTimestampSeconds > 0 ? Math.max(0, Math.floor(shareTimestampSeconds)) : undefined;
      if (SHARING_API_URL) {
        try {
          const res = await createShareLink.mutateAsync({
            video_id: video.id,
            start_seconds: startSeconds,
            target,
            surface: SHARE_SURFACE_MOBILE_VIDEO_PLAYER,
          });
          return res.share_url;
        } catch {
          // fall back to direct URL when share API is unavailable
        }
      }
      const base = WEB_BASE_URL.replace(/\/+$/, "");
      const url = `${base}/video/${video.id}`;
      if (startSeconds && startSeconds > 0) {
        return `${url}?t=${startSeconds}`;
      }
      return url;
    },
    [createShareLink, shareIncludeTimestamp, shareTimestampSeconds, video?.id]
  );

  const handleShareTarget = useCallback(
    async (target: ShareTarget) => {
      if (!video?.id) return;
      setShareStatus("idle");
      try {
        const shareUrl = await buildShareLink(target);
        setGeneratedShareUrl(shareUrl);
        const message = video.title ? `${video.title}\n${shareUrl}` : shareUrl;
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedMessage = encodeURIComponent(message);

        if (target === "copy") {
          await Clipboard.setStringAsync(shareUrl);
          setShareStatus("copied");
          return;
        }

        const openExternal = async (url: string) => {
          try {
            await Linking.openURL(url);
          } catch {
            await Share.share({ message, url: shareUrl });
          }
        };

        switch (target) {
          case "email": {
            const subject = encodeURIComponent(video.title || "CreaTV");
            await openExternal(`mailto:?subject=${subject}&body=${encodedMessage}`);
            break;
          }
          case "sms": {
            await openExternal(`sms:&body=${encodedMessage}`);
            break;
          }
          case "whatsapp": {
            await openExternal(`https://wa.me/?text=${encodedMessage}`);
            break;
          }
          case "telegram": {
            await openExternal(`https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`);
            break;
          }
          case "x": {
            await openExternal(`https://twitter.com/intent/tweet?text=${encodedMessage}`);
            break;
          }
          case "facebook": {
            await openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
            break;
          }
          case "linkedin": {
            await openExternal(`https://www.linkedin.com/feed/?shareActive&text=${encodedMessage}`);
            break;
          }
          case "instagram": {
            await Share.share({ message, url: shareUrl });
            break;
          }
          default: {
            await Share.share({ message, url: shareUrl });
          }
        }
      } catch (error) {
        setShareStatus("error");
        Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [buildShareLink, video?.id, video?.title]
  );

  const handleChapterPress = useCallback(
    (seconds: number) => {
      videoRef.current?.seek(Math.max(0, seconds));
      setPaused(false);
    },
    []
  );

  const likeCount = reactions.likeCount ?? video?.like_count ?? 0;
  const dislikeCount = reactions.dislikeCount ?? video?.dislike_count ?? 0;
  const likeActive = reactions.userReaction === "like";
  const dislikeActive = reactions.userReaction === "dislike";
  const watchLaterActive = watchLaterQuery.data === true;

  const descriptionText = video?.description ?? "";
  const subtitleLine = `${formatViews(video?.view_count)} - ${formatRelativeTime(video?.published_at || video?.created_at)}`;
  const shareTimestampDisplay = formatShareTimestamp(shareTimestampSeconds);

  if (!videoId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Missing video id.</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (videoQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Loading video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (videoQuery.error || !video) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>
            {videoQuery.error instanceof Error ? videoQuery.error.message : "Video not found."}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.videoWrapper} {...swipeResponder.panHandlers}>
          {!hasNativeVideo ? (
            <View style={styles.videoFallback}>
              <Text style={styles.mutedText}>
                Video playback requires a development build with native modules enabled.
              </Text>
              <Text style={styles.mutedText}>Please rebuild the app to enable video playback.</Text>
            </View>
          ) : candidate ? (
            <Video
              ref={videoRef}
              source={{ uri: candidate.url, type: candidate.type }}
              paused={paused}
              volume={volume}
              rate={playbackRate}
              onLoad={handleVideoLoad}
              onProgress={handleVideoProgress}
              onError={handleVideoError}
              onEnd={() => setPaused(true)}
              playInBackground={false}
              playWhenInactive={false}
              resizeMode="contain"
              poster={thumbnailUrl}
              posterResizeMode="cover"
              selectedVideoTrack={selectedVideoTrack}
              style={styles.video}
            />
          ) : (
            <View style={styles.videoFallback}>
              <Text style={styles.mutedText}>No playback source available.</Text>
            </View>
          )}
          {paused ? (
            <Pressable style={styles.playOverlay} onPress={togglePlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={24} color="#fff" />
              </View>
            </Pressable>
          ) : null}
          {playbackError ? (
            <View style={styles.errorBadge}>
              <Text style={styles.errorText}>{playbackError}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.title}>{video.title}</Text>
          <Text style={styles.subtitle}>{subtitleLine}</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={handleToggleLike} disabled={reactions.isPending}>
              <Ionicons name={likeActive ? "thumbs-up" : "thumbs-up-outline"} size={18} color={COLORS.text} />
              <Text style={styles.actionLabel}>{formatCount(likeCount)}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleToggleDislike} disabled={reactions.isPending}>
              <Ionicons name={dislikeActive ? "thumbs-down" : "thumbs-down-outline"} size={18} color={COLORS.text} />
              <Text style={styles.actionLabel}>{formatCount(dislikeCount)}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => setShareOpen(true)}>
              <Ionicons name="share-social-outline" size={18} color={COLORS.text} />
              <Text style={styles.actionLabel}>Share</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleToggleWatchLater} disabled={addToWatchLater.isPending || removeFromWatchLater.isPending}>
              <Ionicons name={watchLaterActive ? "bookmark" : "bookmark-outline"} size={18} color={COLORS.text} />
              <Text style={styles.actionLabel}>{watchLaterActive ? "Saved" : "Watch Later"}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => setSettingsOpen(true)}>
              <Ionicons name="settings-outline" size={18} color={COLORS.text} />
              <Text style={styles.actionLabel}>Settings</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.channelSection}>
          <View style={styles.channelRow}>
            {channel?.avatar_url ? (
              <Image source={{ uri: channel.avatar_url }} style={styles.channelAvatar} />
            ) : (
              <View style={styles.channelAvatarFallback}>
                <Text style={styles.channelAvatarFallbackText}>{channel?.display_name?.charAt(0) ?? "C"}</Text>
              </View>
            )}
            <View style={styles.channelMeta}>
              <Text style={styles.channelName}>{channel?.display_name ?? "Channel"}</Text>
              <Text style={styles.channelSubtext}>{formatCount(channel?.subscriber_count ?? 0)} subscribers</Text>
            </View>
            <Pressable
              style={[styles.subscribeButton, subscription.isSubscribed && styles.subscribedButton]}
              onPress={handleSubscribeToggle}
              disabled={!subscription.canSubmit}
            >
              <Text style={styles.subscribeText}>{subscription.isSubscribed ? "Subscribed" : "Subscribe"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.descriptionSection}>
          <Text
            style={styles.descriptionText}
            numberOfLines={descriptionExpanded ? undefined : 3}
            onTextLayout={(event) => {
              if (descriptionCanExpand) return;
              if (event.nativeEvent.lines.length > 3) {
                setDescriptionCanExpand(true);
              }
            }}
          >
            {descriptionText || "No description provided."}
          </Text>
          {descriptionCanExpand ? (
            <Pressable onPress={() => setDescriptionExpanded((prev) => !prev)}>
              <Text style={styles.moreText}>{descriptionExpanded ? "Show less" : "...more"}</Text>
            </Pressable>
          ) : null}
          {descriptionExpanded && chapters.length > 0 ? (
            <View style={styles.chaptersSection}>
              <Text style={styles.sectionTitle}>Chapters</Text>
              {chapters.map((chapter) => (
                <Pressable key={`${chapter.startSeconds}-${chapter.title}`} style={styles.chapterRow} onPress={() => handleChapterPress(chapter.startSeconds)}>
                  <Text style={styles.chapterTimestamp}>{chapter.displayTimestamp}</Text>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({formatCount(video.comment_count ?? 0)})</Text>
          {!video.is_comments_enabled ? (
            <Text style={styles.mutedText}>Comments are disabled.</Text>
          ) : (
            <>
              <View style={styles.commentInputRow}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  placeholderTextColor={COLORS.muted}
                  style={styles.commentInput}
                  multiline
                />
                <Pressable style={styles.commentButton} onPress={handleCommentSubmit} disabled={postComment.isPending}>
                  <Text style={styles.commentButtonText}>{postComment.isPending ? "Posting..." : "Post"}</Text>
                </Pressable>
              </View>
              {commentsQuery.isLoading ? (
                <Text style={styles.mutedText}>Loading comments...</Text>
              ) : commentsQuery.data?.comments?.length ? (
                commentsQuery.data.comments.map((comment) => {
                  const isCurrentUser = user?.id && Number(user.id) === Number(comment.user_id);
                  const displayName = isCurrentUser ? user?.display_name || user?.username || "You" : "User";
                  return (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{displayName}</Text>
                        <Text style={styles.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
                      </View>
                      <Text style={styles.commentBody}>{comment.content}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.mutedText}>No comments yet. Be the first to comment!</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              {settingsView !== "root" ? (
                <Pressable onPress={() => setSettingsView("root")} style={styles.modalBackButton}>
                  <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </Pressable>
              ) : null}
              <Text style={styles.modalTitle}>
                {settingsView === "playback"
                  ? "Playback speed"
                  : settingsView === "quality"
                  ? "Quality"
                  : settingsView === "sleep"
                  ? "Sleep timer"
                  : "Player settings"}
              </Text>
              <Pressable onPress={() => setSettingsOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </Pressable>
            </View>

            {settingsView === "root" ? (
              <View style={styles.modalContent}>
                <View style={styles.volumeRow}>
                  <Text style={styles.modalLabel}>Volume</Text>
                  <View
                    style={styles.volumeTrack}
                    onLayout={(event) => setVolumeTrackWidth(event.nativeEvent.layout.width)}
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={(event) => {
                      const { locationX } = event.nativeEvent;
                      const ratio =
                        volumeTrackWidth > 0 ? Math.min(Math.max(locationX / volumeTrackWidth, 0), 1) : 0;
                      setVolume(ratio);
                    }}
                    onResponderMove={(event) => {
                      const { locationX } = event.nativeEvent;
                      const ratio =
                        volumeTrackWidth > 0 ? Math.min(Math.max(locationX / volumeTrackWidth, 0), 1) : 0;
                      setVolume(ratio);
                    }}
                  >
                    <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
                    <View style={[styles.volumeThumb, { left: `${volume * 100}%` }]} />
                  </View>
                </View>

                <Pressable style={styles.modalRow} onPress={() => setSettingsView("playback")}>
                  <Text style={styles.modalLabel}>Playback speed</Text>
                  <Text style={styles.modalValue}>
                    {PLAYBACK_SPEED_OPTIONS.find((option) => option.value === playbackRate)?.label ?? "Normal"}
                  </Text>
                </Pressable>
                <Pressable style={styles.modalRow} onPress={() => setSettingsView("quality")}>
                  <Text style={styles.modalLabel}>Quality</Text>
                  <Text style={styles.modalValue}>
                    {qualityOptions.find((option) => option.id === selectedQualityId)?.label ?? "Auto"}
                  </Text>
                </Pressable>
                <Pressable style={styles.modalRow} onPress={() => setSettingsView("sleep")}>
                  <Text style={styles.modalLabel}>Sleep timer</Text>
                  <Text style={styles.modalValue}>{sleepTimerBadgeText}</Text>
                </Pressable>
              </View>
            ) : null}

            {settingsView === "playback" ? (
              <View style={styles.modalContent}>
                {PLAYBACK_SPEED_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.modalRow, playbackRate === option.value && styles.modalRowActive]}
                    onPress={() => {
                      setPlaybackRate(option.value);
                      setSettingsView("root");
                    }}
                  >
                    <Text style={styles.modalLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {settingsView === "quality" ? (
              <View style={styles.modalContent}>
                {qualityOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[styles.modalRow, selectedQualityId === option.id && styles.modalRowActive]}
                    onPress={() => handleQualitySelect(option)}
                  >
                    <Text style={styles.modalLabel}>{option.label}</Text>
                    {option.requiresPremium && !isPremiumViewer ? (
                      <Ionicons name="lock-closed" size={16} color={COLORS.muted} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {settingsView === "sleep" ? (
              <View style={styles.modalContent}>
                {SLEEP_TIMER_OPTIONS.map((option) => (
                  <Pressable
                    key={option.label}
                    style={[styles.modalRow, sleepTimerLabel === option.label && styles.modalRowActive]}
                    onPress={() => handleSleepTimerSelect(option.minutes, option.label)}
                  >
                    <Text style={styles.modalLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={shareOpen} animationType="slide" transparent onRequestClose={() => setShareOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share</Text>
              <Pressable onPress={() => setShareOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.shareRow}>
                <Text style={styles.modalLabel}>Start at {shareTimestampDisplay}</Text>
                <Switch value={shareIncludeTimestamp} onValueChange={handleShareTimestampToggle} />
              </View>
              {shareIncludeTimestamp ? (
                <TextInput
                  value={shareTimestampInput}
                  onChangeText={handleShareTimestampInput}
                  placeholder="0:00"
                  placeholderTextColor={COLORS.muted}
                  style={styles.shareTimestampInput}
                />
              ) : null}
              {generatedShareUrl ? (
                <Text style={styles.shareUrlText} numberOfLines={2}>
                  {generatedShareUrl}
                </Text>
              ) : (
                <Text style={styles.mutedText}>Pick a share option to generate a link.</Text>
              )}
              {shareStatus === "copied" ? <Text style={styles.mutedText}>Copied to clipboard.</Text> : null}
              {shareStatus === "error" ? <Text style={styles.errorText}>Share failed. Try again.</Text> : null}
              <View style={styles.shareTargets}>
                {SHARE_TARGETS.map((target) => (
                  <Pressable key={target.id} style={styles.shareTargetButton} onPress={() => handleShareTarget(target.id)}>
                    <Ionicons name={target.icon} size={20} color={COLORS.text} />
                    <Text style={styles.shareTargetLabel}>{target.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: "#0B0B10",
  text: "#F4F5F7",
  muted: "rgba(244,245,247,0.65)",
  border: "rgba(255,255,255,0.08)",
  accent: "#FF7F50",
  card: "rgba(255,255,255,0.06)",
  overlay: "rgba(0,0,0,0.7)",
  danger: "#EF4444",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  mutedText: {
    color: COLORS.muted,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: "#111",
    fontWeight: "700",
  },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  errorBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: COLORS.overlay,
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
    fontSize: 12,
  },
  metaSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
  },
  actionLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  channelSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  channelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
  },
  channelAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  channelAvatarFallbackText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  channelMeta: {
    flex: 1,
  },
  channelName: {
    color: COLORS.text,
    fontWeight: "700",
  },
  channelSubtext: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  subscribeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  subscribedButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  subscribeText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 12,
  },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  descriptionText: {
    color: COLORS.text,
    lineHeight: 20,
  },
  moreText: {
    color: COLORS.accent,
    marginTop: 6,
    fontWeight: "600",
  },
  chaptersSection: {
    marginTop: 12,
    gap: 8,
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  chapterTimestamp: {
    color: COLORS.accent,
    fontWeight: "700",
  },
  chapterTitle: {
    color: COLORS.text,
    flex: 1,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 8,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  commentButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  commentButtonText: {
    color: "#111",
    fontWeight: "700",
  },
  commentCard: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentAuthor: {
    color: COLORS.text,
    fontWeight: "700",
  },
  commentTime: {
    color: COLORS.muted,
    fontSize: 12,
  },
  commentBody: {
    color: COLORS.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBackButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
  },
  modalRowActive: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  modalLabel: {
    color: COLORS.text,
    fontWeight: "600",
  },
  modalValue: {
    color: COLORS.muted,
  },
  volumeRow: {
    gap: 8,
  },
  volumeTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  volumeFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
  },
  volumeThumb: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: COLORS.text,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shareTimestampInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  shareUrlText: {
    color: COLORS.text,
    fontSize: 12,
  },
  shareTargets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 6,
  },
  shareTargetButton: {
    width: "30%",
    minWidth: 90,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  shareTargetLabel: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: "center",
  },
});
