import { AbsoluteFill, Video, Audio, staticFile } from "remotion";
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

  // Ya no necesitamos 'frame' ni 'interpolate' porque será estático

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>

      {/* 1. VIDEO DE FONDO */}
      <Video
        src={staticFile(`videos/${videoFile}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
        muted
        loop
      />

      {/* 2. CAPA OSCURA (Vignette) */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.3)"
      }} />

      {/* 3. MÚSICA DE PIANO */}
      <Audio src={staticFile(`music/${musicFile}`)} volume={0.8} />

      {/* 4. TEXTO Y AUTOR (ESTÁTICO) */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "50px",
        fontFamily: "'EB Garamond', serif",
        // Sin opacidad ni transformaciones, 100% visible siempre
      }}>

        {/* LA FRASE (Sin comillas) */}
        <h1 style={{
          color: "#ffffff",
          fontSize: 55,
          textAlign: "center",
          lineHeight: 1.3,
          fontWeight: 600,
          textShadow: "0px 2px 10px rgba(0,0,0,0.9), 0px 0px 20px rgba(0,0,0,0.5)",
          margin: 0,
          marginBottom: 30
        }}>
          {text}
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
