export function formatCount(n?: number | null): string {
  if (n == null) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function formatViews(n?: number | null): string {
  if (n == null) return "0 views";
  const formatted = formatCount(n);
  const label = n === 1 ? "view" : "views";
  return `${formatted} ${label}`;
}

export function formatRelativeTime(iso?: string | null): string {
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
  return `${s} second${s === 1 ? "" : "s"} ago`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mins}:${ss}`;
}

export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export const formatShareTimestamp = (totalSeconds: number) => {
  const clamped = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const paddedSeconds = seconds.toString().padStart(2, "0");
  if (hours > 0) {
    const paddedMinutes = minutes.toString().padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
};

export const parseShareTimestampInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;
  const numeric = parts.map((part) => {
    if (!part) return NaN;
    if (!/^\d+$/.test(part)) return NaN;
    return Number(part);
  });
  if (numeric.some((num) => Number.isNaN(num))) {
    return null;
  }
  if (numeric.length === 1) {
    return numeric[0];
  }
  if (numeric.length === 2) {
    if (numeric[1] >= 60) return null;
    return numeric[0] * 60 + numeric[1];
  }
  if (numeric.length === 3) {
    if (numeric[1] >= 60 || numeric[2] >= 60) return null;
    return numeric[0] * 3600 + numeric[1] * 60 + numeric[2];
  }
  return null;
};
