import { useMemo } from "react";

import { parseTimestamp } from "../utils/format";

export type ChapterEntry = {
  title: string;
  startSeconds: number;
  displayTimestamp: string;
  rawLine: string;
};

type ParseChaptersOptions = {
  durationSeconds?: number | null;
};

const TIMESTAMP_REGEX = /(\d{1,2}:\d{2}(?::\d{2})?)/;
const HEADER_KEYWORDS = new Set(["chapters", "timestamps"]);
const DURATION_EPSILON_SECONDS = 2;

const isChapterHeader = (line: string) => {
  const lettersOnly = line.toLowerCase().replace(/[^a-z]/g, "");
  return HEADER_KEYWORDS.has(lettersOnly);
};

const removeTimestampFromLine = (line: string, timestamp: string, index?: number | null) => {
  const safeIndex = typeof index === "number" && index >= 0 ? index : line.indexOf(timestamp);
  if (safeIndex === -1) {
    return line.replace(timestamp, "");
  }
  return line.slice(0, safeIndex) + line.slice(safeIndex + timestamp.length);
};

const stripListMarker = (line: string) => line.replace(/^\s*[-*]\s*/, "");

const stripEdgeSeparators = (line: string) =>
  line
    .replace(/^[\s|\-:]+/, "")
    .replace(/[\s|\-:]+$/, "")
    .trim();

const buildFallbackTitle = (timestamp: string) => `Chapter @ ${timestamp}`;

export const useParseChapters = (descriptionText: string, opts?: ParseChaptersOptions): ChapterEntry[] => {
  const durationSeconds = opts?.durationSeconds;

  return useMemo(() => {
    if (!descriptionText) return [];
    const lines = descriptionText.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => isChapterHeader(line));
    if (headerIndex === -1) return [];

    const entries: ChapterEntry[] = [];
    const seen = new Map<number, number>();
    const durationLimit =
      typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? durationSeconds
        : undefined;
    let started = false;

    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      const rawLine = lines[i] ?? "";
      const trimmed = rawLine.trim();
      if (!trimmed) {
        if (started) break;
        continue;
      }

      const match = rawLine.match(TIMESTAMP_REGEX);
      if (!match) {
        if (started) break;
        continue;
      }

      const displayTimestamp = match[1];
      const seconds = parseTimestamp(displayTimestamp);
      if (!Number.isFinite(seconds) || seconds < 0) {
        if (started) break;
        continue;
      }
      if (durationLimit != null && seconds > durationLimit + DURATION_EPSILON_SECONDS) {
        if (started) break;
        continue;
      }

      started = true;
      const lineWithoutTimestamp = removeTimestampFromLine(rawLine, displayTimestamp, match.index);
      const withoutListMarker = stripListMarker(lineWithoutTimestamp);
      const cleanedTitle = stripEdgeSeparators(withoutListMarker);
      const title = cleanedTitle || buildFallbackTitle(displayTimestamp);
      const entry: ChapterEntry = {
        title,
        startSeconds: seconds,
        displayTimestamp,
        rawLine,
      };

      const existingIndex = seen.get(seconds);
      if (existingIndex == null) {
        seen.set(seconds, entries.length);
        entries.push(entry);
      } else if (entry.title.length > entries[existingIndex].title.length) {
        entries[existingIndex] = entry;
      }
    }

    return entries.sort((a, b) => a.startSeconds - b.startSeconds);
  }, [descriptionText, durationSeconds]);
};
