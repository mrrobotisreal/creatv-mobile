import { SelectedVideoTrackType, type SelectedVideoTrack, type VideoTrack } from "react-native-video";

import type { EngineInit, EngineQualityOption, IPlaybackEngine, PlaybackMode } from "./IPlaybackEngine";

const DEFAULT_QUALITY_ID = "auto";

const qualityIdForTrack = (track: VideoTrack) => {
  if (track.height) return `height-${track.height}`;
  return `track-${track.index}`;
};

export class BaseAdaptiveEngine implements IPlaybackEngine {
  readonly mode: PlaybackMode;
  protected init: EngineInit | null = null;
  protected selectionById: Record<string, SelectedVideoTrack> = {
    [DEFAULT_QUALITY_ID]: { type: SelectedVideoTrackType.AUTO },
  };
  protected selectedId = DEFAULT_QUALITY_ID;
  protected isPremiumViewer = false;
  protected lastTracks: VideoTrack[] = [];

  constructor(mode: PlaybackMode) {
    this.mode = mode;
  }

  load(init: EngineInit) {
    this.destroy();
    this.init = init;
    this.isPremiumViewer = Boolean(init.isPremiumViewer);
    this.selectionById = { [DEFAULT_QUALITY_ID]: { type: SelectedVideoTrackType.AUTO } };
    this.selectedId = DEFAULT_QUALITY_ID;
    this.lastTracks = [];
    this.emitDefaultQualities();
    this.init?.onSelectedVideoTrack?.({ type: SelectedVideoTrackType.AUTO });
  }

  destroy() {
    this.init = null;
    this.lastTracks = [];
  }

  handleTracks(tracks?: VideoTrack[]) {
    const candidates = (tracks ?? []).filter((track) => track.height || track.width || track.bitrate);
    if (!candidates.length) {
      this.emitDefaultQualities();
      return;
    }
    const grouped = new Map<number, VideoTrack>();
    candidates.forEach((track) => {
      const height = track.height ?? 0;
      const existing = grouped.get(height);
      if (!existing) {
        grouped.set(height, track);
        return;
      }
      if ((track.bitrate ?? 0) > (existing.bitrate ?? 0)) {
        grouped.set(height, track);
      }
    });
    const sorted = Array.from(grouped.values()).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
    this.lastTracks = sorted;

    const options: EngineQualityOption[] = sorted.map((track) => {
      const height = track.height ?? undefined;
      const width = track.width ?? undefined;
      const bitrateLabel = track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : undefined;
      const resolutionLabel = width && height ? `${width}x${height}` : undefined;
      const detailParts = [bitrateLabel, resolutionLabel].filter(Boolean).join(" | ") || undefined;
      const isFourK = (height ?? 0) >= 2160 || (width ?? 0) >= 3840;
      const label = height ? `${height}p${isFourK ? " (4K)" : ""}` : bitrateLabel ?? `Track ${track.index + 1}`;
      return {
        id: qualityIdForTrack(track),
        label,
        detail: detailParts,
        requiresPremium: isFourK,
        height,
      };
    });

    const selectionById: Record<string, SelectedVideoTrack> = {
      [DEFAULT_QUALITY_ID]: { type: SelectedVideoTrackType.AUTO },
    };
    sorted.forEach((track) => {
      const id = qualityIdForTrack(track);
      if (track.height) {
        selectionById[id] = { type: SelectedVideoTrackType.RESOLUTION, value: track.height };
      } else {
        selectionById[id] = { type: SelectedVideoTrackType.INDEX, value: track.index };
      }
    });

    this.selectionById = selectionById;
    const optionIds = new Set(options.map((opt) => opt.id));
    if (!optionIds.has(this.selectedId)) {
      this.selectedId = DEFAULT_QUALITY_ID;
      this.init?.onSelectedVideoTrack?.({ type: SelectedVideoTrackType.AUTO });
    }
    this.emitQualities(options);
  }

  setQuality(selectionId: string) {
    if (!selectionId || selectionId === DEFAULT_QUALITY_ID) {
      this.setAutoQuality();
      return;
    }
    const selection = this.selectionById[selectionId];
    if (!selection) return;
    this.selectedId = selectionId;
    this.init?.onSelectedQualityChanged?.(selectionId);
    this.init?.onSelectedVideoTrack?.(selection);
  }

  setAutoQuality() {
    this.selectedId = DEFAULT_QUALITY_ID;
    this.init?.onSelectedQualityChanged?.(DEFAULT_QUALITY_ID);
    this.init?.onSelectedVideoTrack?.({ type: SelectedVideoTrackType.AUTO });
  }

  setPremiumCapping(isPremium: boolean) {
    this.isPremiumViewer = isPremium;
    if (!this.lastTracks.length) return;
    this.emitQualities(
      this.lastTracks.map((track) => ({
        id: qualityIdForTrack(track),
        label: track.height ? `${track.height}p${(track.height ?? 0) >= 2160 ? " (4K)" : ""}` : `Track ${track.index + 1}`,
        detail: track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : undefined,
        requiresPremium: (track.height ?? 0) >= 2160 || (track.width ?? 0) >= 3840,
        height: track.height ?? undefined,
      }))
    );
  }

  protected emitQualities(options: EngineQualityOption[]) {
    const allOptions: EngineQualityOption[] = [
      { id: DEFAULT_QUALITY_ID, label: "Auto", requiresPremium: false },
      ...options,
    ];
    this.init?.onQualities?.({
      options: allOptions,
      selectedId: this.selectedId,
    });
  }

  protected emitDefaultQualities() {
    this.init?.onQualities?.({
      options: [{ id: DEFAULT_QUALITY_ID, label: "Auto", requiresPremium: false }],
      selectedId: DEFAULT_QUALITY_ID,
    });
  }
}
