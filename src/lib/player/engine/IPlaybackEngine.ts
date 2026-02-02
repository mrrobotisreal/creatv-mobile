import type { SelectedVideoTrack, VideoTrack } from "react-native-video";

export type PlaybackMode = "dash" | "hls" | "file";

export type EngineQualityOption = {
  id: string;
  label: string;
  detail?: string;
  requiresPremium?: boolean;
  height?: number;
};

export type EngineInit = {
  isPremiumViewer?: boolean;
  onQualities?: (payload: { options: EngineQualityOption[]; selectedId: string }) => void;
  onSelectedQualityChanged?: (selectedId: string) => void;
  onSelectedVideoTrack?: (track: SelectedVideoTrack) => void;
};

export interface IPlaybackEngine {
  readonly mode: PlaybackMode;
  load(init: EngineInit): void;
  destroy(): void;
  handleTracks(tracks?: VideoTrack[]): void;
  setQuality(selectionId: string): void;
  setAutoQuality(): void;
  setPremiumCapping(isPremium: boolean): void;
}

export type PlaybackCandidate = {
  mode: PlaybackMode;
  url: string;
  type?: string;
};
