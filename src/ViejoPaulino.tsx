import { AbsoluteFill, Video, Audio, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton"; // El equivalente Open Source perfecto a IMPACT
import { z } from "zod";

// Cargar la fuente tipo IMPACT
const { fontFamily } = loadFont();

export const paulinoSchema = z.object({
  audioData: z.string(),
  videoFile: z.string(),
  captions: z.array(z.object({
    word: z.string(),
    start: z.number(),
    end: z.number()
  }))
});

export const ViejoPaulino: React.FC<z.infer<typeof paulinoSchema>> = ({
  audioData, videoFile, captions
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Lógica de Subtítulos Sincronizados
  const currentTime = frame / fps;
  const currentWordObj = captions.find(c => currentTime >= c.start && currentTime <= c.end);

  // 2. Animación Ultra-Fluida (Evita trabas de CPU)
  const scale = currentWordObj ? spring({
    frame: frame - (currentWordObj.start * fps),
    fps,
    config: { stiffness: 300, damping: 15 }
  }) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>

      {/* --- VIDEO DE FONDO --- */}
      {/* 'loop' lo repite infinitamente si el audio dura más que el video */}
      <Video
        src={staticFile(`asmr/${videoFile}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loop={true}
        volume={0.2} // 20% de volumen del juego original
      />

      {/* CAPA DE CONTRASTE (Solo abajo, donde van las letras) */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0, height: "50%",
        background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)"
      }} />

      {/* --- AUDIO DE VOZ IA (100% Volumen) --- */}
      <Audio src={audioData} volume={1.0} />

      {/* --- SUBTÍTULOS ESTILO IMPACT/TIKTOK --- */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        // ALINEACIÓN ABAJO (Tercio inferior, ideal para no tapar el centro)
        alignItems: "flex-end",
        paddingBottom: "25%", // 25% despegado del piso
        paddingLeft: "10%",
        paddingRight: "10%"
      }}>
        {currentWordObj && (
          <h1 style={{
            fontFamily,
            fontSize: 90,
            color: "white", // Color Blanco
            textTransform: "uppercase", // Forzar mayúsculas
            textAlign: "center",
            fontWeight: "normal", // La fuente Anton ya es muy gruesa

            // SOMBRA NEGRA (Estilo Impact)
            WebkitTextStroke: "2px black",
            textShadow: "4px 4px 0px rgba(0,0,0,1)",

            // ANIMACIÓN DE REBOTE
            transform: `scale(${interpolate(scale, [0, 1], [0.8, 1])})`,
            margin: 0,
            lineHeight: 1
          }}>
            {currentWordObj.word}
          </h1>
        )}
      </div>
    </AbsoluteFill>
  );
};
