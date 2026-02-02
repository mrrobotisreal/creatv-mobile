const PUBLIC_BUCKET_BASE_URL = (process.env.EXPO_PUBLIC_PUBLIC_BUCKET_BASE_URL ?? "https://cdn.creatv.io").trim();

export const ensurePublicBucketUrl = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalizedBase = PUBLIC_BUCKET_BASE_URL.replace(/\/+$/, "");
  if (trimmed.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const normalizedPath = trimmed.replace(/^\/+/, "");
  if (!normalizedPath) {
    return normalizedBase;
  }
  return `${normalizedBase}/${normalizedPath}`;
};

const MEDIA_CDN_BASE = (process.env.EXPO_PUBLIC_MEDIA_CDN_URL ?? "https://cdn.creatv.io").trim();

export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.replace(/^\/+/, "");
  if (!normalized) return undefined;
  const base = MEDIA_CDN_BASE;
  if (!base) {
    return `/${normalized}`;
  }
  return `${base.replace(/\/+$/, "")}/${normalized}`;
}
