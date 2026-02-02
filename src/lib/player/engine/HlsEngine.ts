import { BaseAdaptiveEngine } from "./BaseAdaptiveEngine";
import type { PlaybackMode } from "./IPlaybackEngine";

export class HlsEngine extends BaseAdaptiveEngine {
  readonly mode: PlaybackMode = "hls";

  constructor() {
    super("hls");
  }
}
