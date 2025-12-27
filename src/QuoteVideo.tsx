import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile, Img, interpolate } from "remotion";
import { z } from "zod";

export const quoteSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
});

export const QuoteVideo: React.FC<z.infer<typeof quoteSchema>> = ({ text, author }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // --- 1. MOVIMIENTO DE CÁMARA REALISTA (HANDHELD) ---
  // Usamos números primos (53, 71, etc.) para evitar patrones repetitivos (el "ocho").
  // La amplitud es MUY baja (2 o 3 pixeles), solo vibración natural.

  const shakeX = (Math.sin(frame / 53) * 2) + (Math.cos(frame / 127) * 2);
  const shakeY = (Math.cos(frame / 71) * 2) + (Math.sin(frame / 43) * 2);
  const rotate = Math.sin(frame / 200) * 0.5; // Rotación casi imperceptible

  // Un "Breathing" (respiración) del zoom muy lento
  const scale = 1.08 + Math.sin(frame / 300) * 0.01;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile("piano.mp3")} volume={0.8} />

      {/* CONTENEDOR QUE MUEVE TODO JUNTO (FOTO + TEXTO) */}
      <AbsoluteFill
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px) rotate(${rotate}deg) scale(${scale})`,
          width: "100%",
          height: "100%",
          // Importante: Centramos el punto de transformación para que el zoom sea desde el centro
          transformOrigin: "center center",
        }}
      >
        {/* FONDO */}
        <Img
          src={staticFile("background.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* --- 2. POSICIONAMIENTO DEL TEXTO --- */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center", // Verticalmente centrado

            // MÁRGENES FÍSICOS DEL LIBRO (Ajustados a tu foto)
            // Empujamos el texto a la derecha para evitar el lomo y la sombra curva
            paddingLeft: "15%",  // Evita el lomo izquierdo
            paddingRight: "10%", // Margen derecho
            paddingTop: "20%",   // Evita la parte borrosa de arriba

            fontFamily: "'Special Elite', cursive",
          }}
        >
          <h1
            style={{
              fontSize: 52,
              lineHeight: 1.4,
              color: "#222", // Negro suave
              marginBottom: 40,
              textAlign: "left", // Los libros suelen alinearse a la izquierda

              // --- 3. INTEGRACIÓN CON EL PAPEL ---
              mixBlendMode: "multiply", // Fusión
              opacity: 0.85,

              // Desenfoque para igualar la calidad de la foto de fondo (CRUCIAL)
              filter: "blur(0.6px)",

              // Rotación muy leve para que no se vea "pegado con paint"
              transform: "rotate(-1.5deg)",
            }}
          >
            {text}
          </h1>

          <p style={{
              fontSize: 26,
              color: "#555",
              marginTop: 10,
              alignSelf: "flex-end", // Firma a la derecha
              marginRight: 20,

              mixBlendMode: "multiply",
              opacity: 0.7,
              filter: "blur(0.5px)",
              transform: "rotate(-1deg)",
              fontFamily: "Courier New, monospace"
          }}>
            — {author || "Anónimo"}
          </p>
        </div>
      </AbsoluteFill>

      {/* VIGNETTE (Sombra en las esquinas para centrar atención) */}
      <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%)",
          zIndex: 10
      }}/>

    </AbsoluteFill>
  );
};
