import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile, Img } from "remotion";
import { z } from "zod";

export const quoteSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
});

export const QuoteVideo: React.FC<z.infer<typeof quoteSchema>> = ({ text, author }) => {
  const frame = useCurrentFrame();

  // Movimiento sutil (Handheld)
  const shakeX = (Math.sin(frame / 55) * 1.5);
  const shakeY = (Math.cos(frame / 85) * 1.5);
  const scale = 1.02 + Math.sin(frame / 300) * 0.005;

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
        <Img
          src={staticFile("background.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* --- CONTENEDOR DE TEXTO --- */}
        <div
          style={{
            position: "absolute",

            // AJUSTE 1: Bajamos un poco más
            top: "42%",

            // AJUSTE 2: Empujamos fuerte a la derecha para salir de la sombra del libro
            left: "22%",

            // AJUSTE 3: Hacemos la caja más angosta para que el poema se vea compacto
            width: "60%",

            // Rotación sutil
            transform: "rotate(-3.5deg)",

            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            fontFamily: "'EB Garamond', serif",
          }}
        >
          <p
            style={{
              // Subimos un poco el tamaño para compensar que la caja es más chica
              fontSize: 48,
              lineHeight: 1.5,

              color: "#1a1a1a",
              fontWeight: 400,

              // Efectos de realismo
              mixBlendMode: "multiply",
              opacity: 0.9,
              filter: "blur(0.5px)",

              textAlign: "left",
              margin: 0,
            }}
          >
            {text}
          </p>

          {author && (
            <p style={{
                fontSize: 24,
                color: "#555",
                marginTop: 30,
                fontWeight: 400,
                alignSelf: "flex-end",
                marginRight: "5%", // Margen derecho interno de la firma
                fontStyle: "italic",
                opacity: 0.7,
                mixBlendMode: "multiply",
                filter: "blur(0.4px)",
            }}>
              — {author}
            </p>
          )}
        </div>
      </AbsoluteFill>

      {/* Noise sutil */}
      <div style={{
            position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
            mixBlendMode: "overlay",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
      }}/>
    </AbsoluteFill>
  );
};
