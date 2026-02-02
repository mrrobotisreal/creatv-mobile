export type ShareTarget =
  | "copy"
  | "email"
  | "whatsapp"
  | "x"
  | "facebook"
  | "linkedin"
  | "sms"
  | "telegram"
  | "instagram"
  | "other";

export type ShareSurface = string;

export interface CreateShareLinkRequest {
  video_id: number;
  start_seconds?: number;
  target: ShareTarget;
  surface: ShareSurface;
}

export interface ShareLinkPayload {
  share_id: string;
  share_url: string;
  video_id: number;
  start_seconds?: number | null;
  target: ShareTarget;
  surface: ShareSurface;
  sharer_user_id?: number | null;
  created_at: string;
}

export type CreateShareLinkResponse = ShareLinkPayload;

export const SHARE_SURFACE_MOBILE_VIDEO_PLAYER = "mobile_video_player";
