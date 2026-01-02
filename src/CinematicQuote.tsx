import { AbsoluteFill, Video, Audio, staticFile, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

// Schema de datos que recibe
export const cinematicSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
  videoFile: z.string(),
  musicFile: z.string(),
});

export const CinematicQuote: React.FC<z.infer<typeof cinematicSchema>> = ({
  text, author, videoFile, musicFile
}) => {
  const frame = useCurrentFrame();

  // Animación: Aparición suave (Fade In)
  const opacity = interpolate(frame, [0, 20], [0, 1]);
  // Un movimiento imperceptible hacia arriba para darle elegancia
  const moveUp = interpolate(frame, [0, 40], [10, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>

      {/* 1. VIDEO DE FONDO */}
      <Video
        src={staticFile(`videos/${videoFile}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover" // Se adapta a pantalla completa sin bordes negros
        }}
        muted // Muteamos el audio original del video por si acaso
        loop // Por si el video es más corto que la frase
      />

      {/* 2. CAPA OSCURA (Vignette) - Vital para que el texto blanco resalte */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.3)" // 30% de oscuridad general para contraste
      }} />

      {/* 3. MÚSICA DE PIANO */}
      <Audio src={staticFile(`music/${musicFile}`)} volume={0.8} />

      {/* 4. TEXTO Y AUTOR */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "50px", // Margen para que no toque los bordes
        fontFamily: "'EB Garamond', serif",
        opacity,
        transform: `translateY(${moveUp}px)`
      }}>

        {/* LA FRASE */}
        <h1 style={{
          color: "#ffffff",
          fontSize: 55, // Tamaño grande y legible
          textAlign: "center",
          lineHeight: 1.3,
          fontWeight: 600, // Un poco más grueso (Semi-bold) para video

          // EL SECRETO DE LA LEGIBILIDAD (Sombra fuerte estilo TikTok/Cine)
          textShadow: "0px 2px 10px rgba(0,0,0,0.9), 0px 0px 20px rgba(0,0,0,0.5)",

          margin: 0,
          marginBottom: 30
        }}>
          "{text}"
        </h1>

        {/* EL AUTOR */}
        <p style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: 24,
          fontStyle: "italic",
          textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
          fontWeight: 400
        }}>
          — {author || "Anónimo"}
        </p>

      </div>
    </AbsoluteFill>
  );
};
