import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { displayFont } from "./fonts";
import type { FlightProps } from "./schema";

const numberFormat = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

export const FlightEndCard: React.FC<{
  flight: FlightProps;
  distanceKm: number;
  progress: number;
}> = ({ flight, distanceKm, progress }) => {
  const scale = interpolate(progress, [0, 1], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const translateY = interpolate(progress, [0, 1], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lineWidth = interpolate(progress, [0, 1], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const originCode =
    flight.origin.iata ?? flight.origin.city.slice(0, 3).toUpperCase();
  const destinationCode =
    flight.destination.iata ??
    flight.destination.city.slice(0, 3).toUpperCase();

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: progress,
        pointerEvents: "none",
        fontFamily: displayFont,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(2,6,23,0.72) 0%, rgba(2,6,23,0.28) 42%, rgba(2,6,23,0) 72%)",
        }}
      />

      <div
        style={{
          position: "relative",
          textAlign: "center",
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 3.4,
            textTransform: "uppercase",
            color: "#cbd5e1",
          }}
        >
          {flight.flight_number} · {flight.airline}
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 10,
            color: "#ffd23f",
          }}
        >
          {originCode}{" "}
          <span style={{ color: "#94a3b8", letterSpacing: 0 }}>→</span>{" "}
          {destinationCode}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 10,
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 132,
              fontWeight: 800,
              lineHeight: 0.84,
              letterSpacing: -7,
              color: "#f8fafc",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 12px 45px rgba(0,0,0,0.85)",
            }}
          >
            {numberFormat.format(Math.round(distanceKm))}
          </span>
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              color: "#cbd5e1",
            }}
          >
            KM
          </span>
        </div>

        <div
          style={{
            width: 120,
            height: 4,
            margin: "18px auto",
            borderRadius: 999,
            background: "linear-gradient(90deg, #a78bfa, #22d3ee)",
            transform: `scaleX(${lineWidth / 120})`,
          }}
        />

        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#f8fafc",
          }}
        >
          {flight.flight_time_formatted?.toUpperCase() ?? ""}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 1.6,
            color: "#94a3b8",
          }}
        >
          {flight.origin.city} · {flight.destination.city}
        </div>
      </div>
    </AbsoluteFill>
  );
};
