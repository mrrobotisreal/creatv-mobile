import { SelectedVideoTrackType } from "react-native-video";

import type { EngineInit, IPlaybackEngine, PlaybackMode } from "./IPlaybackEngine";

const DEFAULT_QUALITY_ID = "auto";

export class FileEngine implements IPlaybackEngine {
  readonly mode: PlaybackMode = "file";
  private init: EngineInit | null = null;

  load(init: EngineInit) {
    this.init = init;
    this.emitDefaultQualities();
    this.init?.onSelectedVideoTrack?.({ type: SelectedVideoTrackType.AUTO });
  }

  destroy() {
    this.init = null;
  }

  handleTracks() {
    this.emitDefaultQualities();
  }

  setQuality(selectionId: string) {
    if (selectionId !== DEFAULT_QUALITY_ID) {
      this.setAutoQuality();
      return;
    }
    this.init?.onSelectedQualityChanged?.(DEFAULT_QUALITY_ID);
  }

  setAutoQuality() {
    this.init?.onSelectedQualityChanged?.(DEFAULT_QUALITY_ID);
    this.init?.onSelectedVideoTrack?.({ type: SelectedVideoTrackType.AUTO });
  }

  setPremiumCapping() {
    // no-op for file playback
  }

  private emitDefaultQualities() {
    this.init?.onQualities?.({
      options: [{ id: DEFAULT_QUALITY_ID, label: "Auto", requiresPremium: false }],
      selectedId: DEFAULT_QUALITY_ID,
    });
  }
}
