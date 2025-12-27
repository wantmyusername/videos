import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile, Img } from "remotion";
import { z } from "zod";
import { useMemo } from "react";

export const quoteSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
});

export const QuoteVideo: React.FC<z.infer<typeof quoteSchema>> = ({ text, author }) => {
  const frame = useCurrentFrame();

  // --- 1. MOVIMIENTO DE CÁMARA (Sutil y orgánico) ---
  // Reducido al mínimo para que no maree, solo "respira"
  const shakeX = (Math.sin(frame / 60) * 1.5);
  const shakeY = (Math.cos(frame / 80) * 1.5);
  const scale = 1.02 + Math.sin(frame / 250) * 0.005; // Zoom casi imperceptible

  // --- 2. NÚMERO DE CAPÍTULO ALEATORIO ---
  // Generamos un número romano random (ej. "XV", "XXII") para darle realismo
  const chapter = useMemo(() => {
    const romans = ["IX", "XI", "XVII", "XXII", "XXV", "XVIII", "XXX"];
    return romans[Math.floor(Math.random() * romans.length)];
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile("piano.mp3")} volume={0.8} />

      <AbsoluteFill
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px) scale(${scale})`,
          width: "100%", height: "100%",
          transformOrigin: "center center",
        }}
      >
        {/* FONDO (Tu foto del libro) */}
        <Img
          src={staticFile("background.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* --- 3. CONTENEDOR DE TEXTO (Rotado para seguir la hoja) --- */}
        <div
          style={{
            position: "absolute",
            top: "22%",  // Altura donde empieza el texto en tu foto
            left: "18%", // Margen izquierdo grande (es página derecha)
            width: "65%", // El texto no ocupa todo el ancho

            // ROTACIÓN CLAVE: Inclinamos el texto para que siga la línea del libro
            transform: "rotate(-6deg)",

            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start", // Alineado a la izquierda como en el libro
            fontFamily: "'EB Garamond', serif",
          }}
        >
          {/* NÚMERO DE CAPÍTULO (Ej: XXII) */}
          <div style={{
            width: "100%",
            textAlign: "center", // El número sí va centrado respecto al bloque de texto
            fontSize: 32,
            color: "#1a1a1a",
            marginBottom: 50, // Espacio entre número y poema
            opacity: 0.8,
            mixBlendMode: "multiply",
            letterSpacing: 2,
            fontWeight: 500,
            filter: "blur(0.4px)",
          }}>
            {chapter}
          </div>

          {/* EL POEMA / TEXTO */}
          <h1
            style={{
              fontSize: 42, // Tamaño realista de lectura
              lineHeight: 1.5, // Espaciado cómodo
              color: "#050505", // Tinta casi negra

              // Realismo de impresión:
              mixBlendMode: "multiply",
              opacity: 0.9,
              filter: "blur(0.5px)", // Suavizado para que no parezca digital

              textAlign: "left",
            }}
          >
            {text}
          </h1>

          {/* FIRMA (Pequeña y sutil, opcional) */}
          {author && (
            <p style={{
                fontSize: 20,
                color: "#444",
                marginTop: 30,
                alignSelf: "flex-end", // A la derecha del bloque
                fontStyle: "italic",
                opacity: 0.6,
                mixBlendMode: "multiply",
            }}>
              — {author}
            </p>
          )}
        </div>
      </AbsoluteFill>

      {/* RUIDO DEL PAPEL (Textura extra para unificar) */}
      <div style={{
            position: "absolute", inset: 0, opacity: 0.08, pointerEvents: "none",
            mixBlendMode: "overlay",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
      }}/>
    </AbsoluteFill>
  );
};
