import React from "react";

// Límites de la zona segura, en porcentaje del video completo.
// SAFE_RIGHT y SAFE_BOTTOM son coordenadas absolutas (borde derecho e
// inferior), NO márgenes desde el borde.
export const SAFE_LEFT = 12; // el contenido no empieza antes del 12% del ancho
export const SAFE_RIGHT = 78; // el contenido no pasa del 78% del ancho
export const SAFE_TOP = 14; // el contenido no empieza antes del 14% del alto
export const SAFE_BOTTOM = 75; // el contenido no pasa del 75% del alto

// Ancho y alto útiles de la zona segura.
export const SAFE_WIDTH = SAFE_RIGHT - SAFE_LEFT;
export const SAFE_HEIGHT = SAFE_BOTTOM - SAFE_TOP;

// Distancias desde los bordes derecho e inferior, para usar con right/bottom.
export const SAFE_RIGHT_INSET = 100 - SAFE_RIGHT;
export const SAFE_BOTTOM_INSET = 100 - SAFE_BOTTOM;

const safeZoneStyle: React.CSSProperties = {
  position: "absolute",
  left: `${SAFE_LEFT}%`,
  top: `${SAFE_TOP}%`,
  width: `${SAFE_WIDTH}%`,
  height: `${SAFE_HEIGHT}%`,
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
