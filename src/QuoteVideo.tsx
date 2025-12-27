import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Audio, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cormorant-Garamond"; // Fuente elegante tipo libro
import { z } from "zod";

const { fontFamily } = loadFont();

// Schema para n8n
export const quoteSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
});

export const QuoteVideo: React.FC<z.infer<typeof quoteSchema>> = ({ text, author }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // --- ANIMACIONES ---
  const opacity = interpolate(frame, [0, 60], [0, 1]); // Tarda 2 seg en aparecer
  const blur = interpolate(frame, [0, 60], [10, 0]);   // Efecto de desenfoque al entrar
  
  // Zoom muy lento y sutil (Efecto "Ken Burns" para que no sea una foto estática)
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.05]); 

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f2f0e9", // Color Papel Antiguo
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      {/* 🎵 MÚSICA DE FONDO (Debe estar en la carpeta public/) */}
      <Audio src={staticFile("piano.mp3")} volume={0.8} />

      {/* 📜 TEXTURA DE RUIDO (Para que parezca papel) */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.4,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
      }} />

      {/* ✍️ CONTENEDOR DEL TEXTO */}
      <div
        style={{
          width: "80%",
          textAlign: "center",
          opacity,
          filter: `blur(${blur}px)`,
          transform: `scale(${scale})`,
          color: "#2c2c2c", // Gris muy oscuro (casi negro)
        }}
      >
        <h1
          style={{
            fontSize: 75,
            fontWeight: 500,
            lineHeight: 1.4,
            fontStyle: "italic",
            marginBottom: 40,
          }}
        >
          “{text}”
        </h1>

        {/* Autor o Firma */}
        <p style={{ fontSize: 30, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>
          {author || "@escrito.365"}
        </p>
      </div>
    </AbsoluteFill>
  );
};
