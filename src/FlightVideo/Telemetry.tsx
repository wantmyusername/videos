import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { displayFont } from "./fonts";
import type { FlightProps } from "./schema";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

const numberFormat = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

const SecondaryStat: React.FC<{
  label: string;
  value: string;
  unit: string;
}> = ({ label, value, unit }) => (
  <div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 2.4,
        textTransform: "uppercase",
        color: "#94a3b8",
      }}
    >
      {label}
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 5,
        marginTop: 3,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: -1,
          color: "#f8fafc",
          textShadow: "0 4px 20px rgba(0,0,0,0.7)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 1,
          color: "#94a3b8",
        }}
      >
        {unit}
      </span>
    </div>
  </div>
);

export const FlightTelemetry: React.FC<{
  flight: FlightProps;
  distanceKm: number;
  progress: number;
  taxiIn: number;
  taxiOut: number;
  fadeOut?: number;
}> = ({
  flight,
  distanceKm,
  progress,
  taxiIn,
  taxiOut,
  fadeOut = 1,
}) => {
  const frame = useCurrentFrame();
  const opacity =
    interpolate(frame, [12, 36], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;
  const translateY = interpolate(frame, [12, 36], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const climb = smoothstep(0, 0.16, progress);
  const descent = smoothstep(0.84, 1, progress);
  const onGround = taxiIn < 0.999 || taxiOut > 0.001;
  const altitudeFt = onGround
    ? 0
    : Math.max(0, 36000 * (climb - descent));
  const speedKmh = onGround
    ? 25
    : 20 + 830 * climb * (1 - 0.75 * descent);
  const remainingKm = Math.max(0, distanceKm * (1 - progress));
  const phase = onGround
    ? "Rodaje"
    : progress >= 0.995
      ? "Aterrizaje"
      : progress > 0.82
        ? "Descenso"
        : progress < 0.12
          ? "Ascenso"
          : "Crucero";
  const phaseColor =
    phase === "Rodaje"
      ? "#cbd5e1"
      : phase === "Ascenso"
        ? "#ff3d7f"
        : phase === "Descenso"
          ? "#38bdf8"
          : phase === "Aterrizaje"
            ? "#22c55e"
            : "#ffd23f";
  const originCode =
    flight.origin.iata ?? flight.origin.city.slice(0, 3).toUpperCase();
  const destinationCode =
    flight.destination.iata ??
    flight.destination.city.slice(0, 3).toUpperCase();

  return (
    <div
      style={{
        position: "absolute",
        left: 54,
        right: 54,
        bottom: 310,
        fontFamily: displayFont,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 3.4,
          textTransform: "uppercase",
          color: phaseColor,
          textShadow: "0 4px 18px rgba(0,0,0,0.8)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: phaseColor,
            boxShadow: `0 0 16px ${phaseColor}`,
          }}
        />
        {phase}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 26,
          marginTop: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            minWidth: 300,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 0.82,
              letterSpacing: -5,
              color: "#f8fafc",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 10px 40px rgba(0,0,0,0.8)",
            }}
          >
            {numberFormat.format(Math.round(speedKmh / 5) * 5)}
          </span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: phaseColor,
              textShadow: "0 4px 18px rgba(0,0,0,0.8)",
            }}
          >
            KM/H
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 38,
            paddingBottom: 4,
          }}
        >
          <SecondaryStat
            label="Altitud"
            value={numberFormat.format(
              Math.round(altitudeFt / 100) * 100,
            )}
            unit="FT"
          />
          <SecondaryStat
            label="Restante"
            value={numberFormat.format(Math.round(remainingKm))}
            unit="KM"
          />
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 4,
          marginTop: 24,
          borderRadius: 999,
          backgroundColor: "rgba(148, 163, 184, 0.28)",
        }}
      >
        <div
          style={{
            width: `${clamp(progress, 0, 1) * 100}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #ff3d7f, #ffd23f)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${clamp(progress, 0, 1) * 100}%`,
            top: -4,
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#ffd23f",
            boxShadow: "0 0 16px rgba(255, 210, 63, 0.95)",
            transform: "translateX(-50%)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 8,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 1.2,
          color: "#94a3b8",
          textShadow: "0 3px 12px rgba(0,0,0,0.8)",
        }}
      >
        <span>
          <span style={{ color: "#f8fafc", fontWeight: 800 }}>
            {originCode}
          </span>
          {flight.departure_time ? ` ${flight.departure_time}` : ""}
        </span>
        <span style={{ letterSpacing: 2, textTransform: "uppercase" }}>
          {flight.flight_time_formatted ?? ""}
        </span>
        <span>
          {flight.arrival_time ? `${flight.arrival_time} ` : ""}
          <span style={{ color: "#f8fafc", fontWeight: 800 }}>
            {destinationCode}
          </span>
        </span>
      </div>
    </div>
  );
};
