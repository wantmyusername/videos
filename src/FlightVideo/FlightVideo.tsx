import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GlobeScene } from "./GlobeScene";
import {
  OUTRO_SECONDS,
  RegionalMapScene,
  isRegionalRoute,
} from "./RegionalMapScene";
import { Subtitles } from "./Subtitles";
import { FlightTelemetry } from "./Telemetry";
import { FlightEndCard } from "./EndCard";
import { haversineKm } from "./geo";
import {
  SAFE_LEFT,
  SAFE_RIGHT_INSET,
  SAFE_TOP,
  SAFE_WIDTH,
  SafeZoneDebug,
} from "./SafeZone";
import type { FlightProps } from "./schema";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const TAKEOFF_FRAME = 18;
const DING_DONG_DELAY_SECONDS = 3;
const DING_DONG_END_OFFSET_SECONDS = 3;
export const END_CARD_EXTRA_SECONDS = 2;
const WHITE_NOISE_START_SECONDS_DEFAULT = 1;
const WHITE_NOISE_VOLUME = 0.5;
const DING_DONG_VOLUME = 0.9;

const formatDistance = (value?: number) =>
  value === undefined
    ? null
    : `${new Intl.NumberFormat("es-ES").format(Math.round(value))} km`;

const TITLE_CHAR_WIDTH = 0.7;

const splitTitleLines = (text: string): [string, string] => {
  const trimmed = text.trim();
  const dashParts = trimmed.split(/\s+[-–—]\s+/);

  if (dashParts.length === 2) {
    return [`${dashParts[0]} -`, dashParts[1]];
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 2) {
    return [trimmed, ""];
  }

  let bestIndex = 1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index++) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const diff = Math.abs(first.length - second.length);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }

  return [
    words.slice(0, bestIndex).join(" "),
    words.slice(bestIndex).join(" "),
  ];
};

export const FlightVideo: React.FC<FlightProps> = (flight) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();

  const introProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const globeScale = interpolate(frame, [0, 45], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const distanceKm =
    flight.distance_km ??
    haversineKm(flight.origin, flight.destination);
  const showRegionalMap = isRegionalRoute(flight, distanceKm);
  const endCardExtraFrames = Math.round(fps * END_CARD_EXTRA_SECONDS);
  const flightDuration = Math.max(1, durationInFrames - endCardExtraFrames);
  const outroFrames = Math.round(fps * OUTRO_SECONDS);
  const outroStartFrame = Math.max(1, flightDuration - outroFrames);
  const endCardStart = Math.max(
    0,
    flightDuration - Math.round(fps * 2),
  );
  const endCardProgress = interpolate(
    frame,
    [endCardStart, endCardStart + 16],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const hasNarration = Boolean(flight.audioUrl);
  const ambientVolume = hasNarration ? 0.2 : WHITE_NOISE_VOLUME;
  const whiteNoiseStartFrame = Math.round(
    fps * (flight.whiteNoiseStartSeconds ?? WHITE_NOISE_START_SECONDS_DEFAULT),
  );
  const whiteNoiseFadeInFrames = Math.round(fps * 0.3);
  const whiteNoiseFadeOutStart = Math.max(
    whiteNoiseStartFrame + whiteNoiseFadeInFrames + 1,
    outroStartFrame - 20,
  );
  const taxiInFrames = showRegionalMap ? Math.round(fps * 2.4) : 0;
  const routeStartFrame = TAKEOFF_FRAME + taxiInFrames;
  const routeEndFrame = Math.min(
    durationInFrames - 1,
    Math.max(routeStartFrame + 1, outroStartFrame),
  );
  const routeProgress = interpolate(
    frame,
    [routeStartFrame, routeEndFrame],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const taxiInProgress = showRegionalMap
    ? interpolate(frame, [TAKEOFF_FRAME, routeStartFrame], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const distanceReveal = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const distance = formatDistance(Math.max(1, distanceKm * distanceReveal));
  const hasStaticMap = Boolean(
    showRegionalMap && flight.mapImageUrl && flight.mapBbox,
  );
  const badgeScale = interpolate(frame, [0, 18], [0.72, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.8)),
  });

  const safeContentWidth = width * (SAFE_WIDTH / 100);
  const titleLength = Math.max(1, flight.title_overlay.length);
  const oneLineTitleSize = Math.floor(
    safeContentWidth / (titleLength * TITLE_CHAR_WIDTH),
  );
  const canWrapTitle =
    oneLineTitleSize < 48 &&
    flight.title_overlay.trim().split(/\s+/).filter(Boolean).length > 1;
  const titleLines = canWrapTitle
    ? splitTitleLines(flight.title_overlay)
    : ([flight.title_overlay, ""] as const);
  const longestTitleLine = Math.max(
    1,
    ...titleLines.map((line) => line.length),
  );
  const titleSize = canWrapTitle
    ? Math.max(
        30,
        Math.min(
          64,
          Math.floor(safeContentWidth / (longestTitleLine * TITLE_CHAR_WIDTH)),
        ),
      )
    : Math.max(40, Math.min(72, oneLineTitleSize));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#020617",
        fontFamily,
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      <Audio
        src={staticFile("earth/Sonido_Blanco.mp3")}
        volume={(volumeFrame) => {
          const envelope = interpolate(
            volumeFrame,
            [
              whiteNoiseStartFrame,
              whiteNoiseStartFrame + whiteNoiseFadeInFrames,
              whiteNoiseFadeOutStart,
              outroStartFrame,
            ],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const time = volumeFrame / fps;
          const speaking =
            hasNarration &&
            flight.words?.some(
              (word) =>
                time >= word.start - 0.08 && time <= word.end + 0.12,
            );

          return ambientVolume * envelope * (speaking ? 0.45 : 1);
        }}
        loop
      />

      <Sequence from={TAKEOFF_FRAME + DING_DONG_DELAY_SECONDS * fps}>
        <Audio
          src={staticFile("earth/Ding_Dong Sound.mp3")}
          volume={DING_DONG_VOLUME}
        />
      </Sequence>

      <Sequence
        from={Math.max(
          0,
          durationInFrames - DING_DONG_END_OFFSET_SECONDS * fps,
        )}
      >
        <Audio
          src={staticFile("earth/Ding_Dong Sound.mp3")}
          volume={DING_DONG_VOLUME}
        />
      </Sequence>

      {flight.audioUrl ? <Audio src={flight.audioUrl} /> : null}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 42%, #243449 0%, #111c2e 48%, #060b14 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          transform: showRegionalMap
            ? undefined
            : `scale(${globeScale})`,
          opacity: showRegionalMap ? 1 : introProgress,
        }}
      >
        {showRegionalMap ? (
          <RegionalMapScene
            flight={flight}
            progress={routeProgress}
            taxiIn={taxiInProgress}
            outroStartFrame={outroStartFrame}
          />
        ) : (
          <ThreeCanvas
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0 }}
            camera={{ fov: 40, near: 0.1, far: 200, position: [0, 0, 8] }}
            gl={{ antialias: true, alpha: true }}
          >
            <GlobeScene flight={flight} progress={routeProgress} />
          </ThreeCanvas>
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: hasStaticMap
            ? "linear-gradient(180deg, rgba(2,6,23,0.76) 0%, rgba(2,6,23,0.2) 30%, rgba(2,6,23,0) 48%, rgba(2,6,23,0.24) 78%, rgba(2,6,23,0.76) 100%)"
            : "linear-gradient(180deg, rgba(2,6,23,0.48) 0%, rgba(2,6,23,0.06) 28%, rgba(2,6,23,0) 50%, rgba(2,6,23,0) 82%, rgba(2,6,23,0.16) 100%)",
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          background: hasStaticMap
            ? "radial-gradient(ellipse at center, rgba(2,6,23,0) 42%, rgba(2,6,23,0.18) 100%)"
            : "radial-gradient(ellipse at center, rgba(2,6,23,0) 60%, rgba(2,6,23,0.04) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: `${SAFE_TOP}%`,
          left: `${SAFE_LEFT}%`,
          right: `${SAFE_RIGHT_INSET}%`,
          opacity: introProgress * (1 - endCardProgress),
          transform: `translateY(${interpolate(
            introProgress,
            [0, 1],
            [-40, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 18,
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: 1.5,
              transform: `scale(${badgeScale})`,
              transformOrigin: "center center",
            }}
          >
            {flight.flight_number}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#e2e8f0",
              opacity: 0.85,
            }}
          >
            {flight.airline}
          </div>
        </div>

        <h1
          style={{
            margin: "26px 0 0",
            maxWidth: "100%",
            fontSize: titleSize,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -1,
            overflowWrap: "break-word",
            textShadow: "0 6px 30px rgba(0,0,0,0.8)",
          }}
        >
          {(canWrapTitle ? titleLines : [flight.title_overlay]).map(
            (line, index) =>
              line ? (
                <span
                  key={`${line}-${index}`}
                  style={{ display: "block" }}
                >
                  {line}
                </span>
              ) : null,
          )}
        </h1>

        {flight.subtitle_overlay ? (
          <p
            style={{
              margin: "18px 0 0",
              maxWidth: "100%",
              fontSize: 32,
              fontWeight: 500,
              lineHeight: 1.3,
              color: "#cbd5e1",
              textShadow: "0 4px 20px rgba(0,0,0,0.85)",
            }}
          >
            {flight.subtitle_overlay}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 28,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#cbd5e1",
            textShadow: "0 4px 18px rgba(0,0,0,0.8)",
          }}
        >
          {distance ? <span>{distance}</span> : null}
          {distance && flight.flight_time_formatted ? (
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#ffd23f",
                boxShadow: "0 0 12px rgba(255, 210, 63, 0.8)",
              }}
            />
          ) : null}
          {flight.flight_time_formatted ? (
            <span>{flight.flight_time_formatted}</span>
          ) : null}
        </div>
      </div>

      <FlightTelemetry
        flight={flight}
        distanceKm={distanceKm}
        progress={routeProgress}
        taxiIn={taxiInProgress}
        fadeOut={1 - endCardProgress}
      />

      <FlightEndCard
        flight={flight}
        distanceKm={distanceKm}
        progress={endCardProgress}
      />

      {flight.mapAttribution ? (
        <div
          style={{
            position: "absolute",
            top: `${SAFE_TOP}%`,
            right: `${SAFE_RIGHT_INSET}%`,
            padding: "5px 9px",
            borderRadius: 7,
            backgroundColor: "rgba(2, 6, 23, 0.34)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.2,
            color: "rgba(226, 232, 240, 0.62)",
            textShadow: "0 2px 8px rgba(0,0,0,0.85)",
          }}
        >
          {flight.mapAttribution}
        </div>
      ) : null}

      <Subtitles words={flight.words} />

      {flight.showSafeZone ? <SafeZoneDebug /> : null}
    </AbsoluteFill>
  );
};
