import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile, Img, interpolate } from "remotion";
import { z } from "zod";

export const quoteSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
});

export const QuoteVideo: React.FC<z.infer<typeof quoteSchema>> = ({ text, author }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // --- EFECTO CÁMARA EN MANO (Handheld) ---
  // Usamos Math.sin y Math.cos con diferentes frecuencias para crear un movimiento orgánico "imperfecto"

  // Movimiento Horizontal (izquierda/derecha)
  const shakeX = Math.sin(frame / 25) * 15 + Math.cos(frame / 60) * 10;

  // Movimiento Vertical (arriba/abajo)
  const shakeY = Math.cos(frame / 30) * 15 + Math.sin(frame / 50) * 10;

  // Rotación muy sutil (el pulso nunca es recto)
  const rotate = Math.sin(frame / 40) * 0.8;

  // Zoom sutil (In & Out lento, como respirando)
  const scale = 1.05 + Math.sin(frame / 100) * 0.02;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 🎵 MÚSICA */}
      <Audio src={staticFile("piano.mp3")} volume={0.8} />

      {/* 📷 CONTENEDOR PRINCIPAL CON EL MOVIMIENTO */}
      <AbsoluteFill
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px) rotate(${rotate}deg) scale(${scale})`,
          // Escalamos un poco más del 100% para que al moverse no se vean bordes negros
          width: "110%",
          height: "110%",
          left: "-5%", // Centramos el exceso
          top: "-5%",
        }}
      >
        {/* 📖 IMAGEN DE FONDO REAL */}
        <Img
          src={staticFile("background.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // Se adapta a la pantalla
          }}
        />

        {/* ✍️ TEXTO (Estilo Máquina de Escribir) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "80px",
            fontFamily: "'Special Elite', cursive", // La fuente que importamos
          }}
        >
          <h1
            style={{
              fontSize: 58, // Un poco más pequeño para que parezca libro
              lineHeight: 1.5,
              color: "#1a1a1a", // Negro no puro (tinta)
              marginBottom: 50,
              textAlign: "center", // O "left" si prefieres estilo poema

              // TRUCO DE REALISMO:
              mixBlendMode: "multiply", // Funde el texto con la textura del papel
              opacity: 0.85, // La tinta nunca es 100% opaca
              transform: "rotate(-1deg)", // El papel nunca está 100% recto al imprimir
            }}
          >
            {text}
          </h1>

          <p style={{
              fontSize: 28,
              color: "#4a4a4a",
              marginTop: 20,
              alignSelf: "flex-end", // Firma a la derecha
              marginRight: 40,
              mixBlendMode: "multiply",
              opacity: 0.7,
              fontFamily: "Courier New, monospace" // Firma un poco distinta
          }}>
            — {author || "Anónimo"}
          </p>
        </div>
      </AbsoluteFill>

      {/* CAPA DE RUIDO EXTRA (Opcional, para unificar video y texto) */}
      <div style={{
            position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
      }}/>
    </AbsoluteFill>
  );
};
