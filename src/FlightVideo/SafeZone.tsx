import React from "react";

export const SAFE_LEFT = 4;
export const SAFE_RIGHT = 18;
export const SAFE_TOP = 6.5;
export const SAFE_BOTTOM = 18;

export const SAFE_WIDTH = 100 - SAFE_LEFT - SAFE_RIGHT;
export const SAFE_HEIGHT = 100 - SAFE_TOP - SAFE_BOTTOM;

export const safeZoneStyle: React.CSSProperties = {
  position: "absolute",
  left: `${SAFE_LEFT}%`,
  right: `${SAFE_RIGHT}%`,
  top: `${SAFE_TOP}%`,
  bottom: `${SAFE_BOTTOM}%`,
};

export const SafeZoneDebug: React.FC = () => (
  <div
    style={{
      ...safeZoneStyle,
      border: "3px dashed #ef4444",
      pointerEvents: "none",
      zIndex: 9999,
    }}
  />
);
