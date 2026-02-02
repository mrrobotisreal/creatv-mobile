import { BaseAdaptiveEngine } from "./BaseAdaptiveEngine";
import type { PlaybackMode } from "./IPlaybackEngine";

export class DashEngine extends BaseAdaptiveEngine {
  readonly mode: PlaybackMode = "dash";

  constructor() {
    super("dash");
  }
}
