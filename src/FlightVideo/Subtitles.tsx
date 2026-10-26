import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Word = {
  text: string;
  start: number;
  end: number;
};

type Chunk = {
  words: Word[];
  start: number;
  end: number;
};

const MAX_WORDS_PER_CHUNK = 6;
const MAX_CHUNK_SECONDS = 3.2;
const MAX_GAP_SECONDS = 0.45;

export const Subtitles: React.FC<{
  words?: { word?: string; text?: string; start: number; end: number }[];
  fallback?: string;
}> = ({ words, fallback }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const chunks = useMemo<Chunk[]>(() => {
    const normalized = (words ?? [])
      .map((word) => ({
        text: (word.word ?? word.text ?? "").trim(),
        start: word.start,
        end: word.end,
      }))
      .filter((word) => word.text.length > 0);

    const result: Chunk[] = [];
    let current: Word[] = [];

    const flush = () => {
      if (current.length > 0) {
        result.push({
          words: current,
          start: current[0].start,
          end: current[current.length - 1].end,
        });
        current = [];
      }
    };

    for (const word of normalized) {
      const previous = current[current.length - 1];

      if (previous) {
        const gap = word.start - previous.end;
        const duration = word.end - current[0].start;
        const endsSentence = /[.!?…]$/.test(previous.text);

        if (
          current.length >= MAX_WORDS_PER_CHUNK ||
          gap > MAX_GAP_SECONDS ||
          duration > MAX_CHUNK_SECONDS ||
          endsSentence
        ) {
          flush();
        }
      }

      current.push(word);
    }

    flush();
    return result;
  }, [words]);

  const activeChunk = chunks.find(
    (chunk) => time >= chunk.start - 0.08 && time <= chunk.end + 0.2,
  );

  if (!activeChunk) {
    if (!fallback) {
      return null;
    }

    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 580,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "88%",
            textAlign: "center",
            fontSize: 42,
            lineHeight: 1.3,
            fontWeight: 600,
            color: "#e2e8f0",
            textShadow: "0 4px 18px rgba(0,0,0,0.9)",
          }}
        >
          {fallback}
        </div>
      </div>
    );
  }

  const opacity = interpolate(
    time,
    [
      activeChunk.start - 0.08,
      activeChunk.start + 0.1,
      activeChunk.end + 0.02,
      activeChunk.end + 0.2,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 560,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          width: "92%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          rowGap: 8,
        }}
      >
        {activeChunk.words.map((word, index) => {
          const isActive = time >= word.start && time <= word.end;
          const isPast = time > word.end;

          return (
            <span
              key={`${word.start}-${index}`}
              style={{
                display: "inline-block",
                margin: "0 9px",
                fontSize: isActive ? 60 : 56,
                lineHeight: 1.25,
                fontWeight: isActive ? 900 : 800,
                color: isActive ? "#facc15" : isPast ? "#cbd5e1" : "#f8fafc",
                textShadow:
                  "0 4px 22px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.95)",
                transform: isActive ? "scale(1.06)" : undefined,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
