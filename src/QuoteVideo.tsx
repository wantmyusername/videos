import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile, Img } from "remotion";
import { z } from "zod";

export const quoteSchema = z.object({
  text: z.string(),
  author: z.string().optional(),
});

export const QuoteVideo: React.FC<z.infer<typeof quoteSchema>> = ({ text, author }) => {
  const frame = useCurrentFrame();

  // --- MOVIMIENTO DE CÁMARA MUY SUTIL ---
  // Apenas unos píxeles de deriva para dar vida
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
        {/* FONDO (Tu foto del libro) */}
        <Img
          src={staticFile("background.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* --- CONTENEDOR DE TEXTO --- */}
        <div
          style={{
            position: "absolute",
            // AJUSTE CLAVE: Bajamos el texto al 38% de la pantalla para que caiga EN LA HOJA
            top: "38%",
            left: "12%", // Margen izquierdo
            width: "80%", // Ancho disponible

            // Rotación ligera para seguir la curva de la página
            transform: "rotate(-4deg)",

            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            fontFamily: "'EB Garamond', serif",
          }}
        >
          {/* EL POEMA / TEXTO */}
          <p
            style={{
              fontSize: 40, // Tamaño lectura
              lineHeight: 1.4,

              // COLOR Y PESO (REALISMO)
              color: "#181818", // No uses negro puro (#000), usa gris muy oscuro
              fontWeight: 400,  // NORMAL (No Bold)

              // Efectos de Impresión
              mixBlendMode: "multiply", // Se funde con el grano del papel
              opacity: 0.9, // La tinta vieja se desvanece un poco
              filter: "blur(0.4px)", // Suaviza los bordes digitales afilados

              textAlign: "left",
              margin: 0,
            }}
          >
            {text}
          </p>

          {/* FIRMA */}
          {author && (
            <p style={{
                fontSize: 22,
                color: "#4a4a4a",
                marginTop: 25,
                fontWeight: 400,
                alignSelf: "flex-end", // A la derecha
                marginRight: "10%",
                fontStyle: "italic",
                opacity: 0.7,
                mixBlendMode: "multiply",
                filter: "blur(0.3px)",
            }}>
              — {author}
            </p>
          )}
        </div>
      </AbsoluteFill>

      {/* CAPA DE RUIDO (Noise) */}
      <div style={{
            position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none",
            mixBlendMode: "overlay",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
      }}/>
    </AbsoluteFill>
  );
};
