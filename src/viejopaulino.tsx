import { AbsoluteFill, Video, Audio, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { z } from "zod";

const { fontFamily } = loadFont();

// Schema de datos
export const paulinoSchema = z.object({
  audioData: z.string(), // Audio en Base64
  videoFile: z.string(), // Nombre del archivo ASMR
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

  // --- LÓGICA DE SUBTÍTULOS ---
  const currentTime = frame / fps;
  const currentWordObj = captions.find(c => currentTime >= c.start && currentTime <= c.end);

  // Animación "Pop"
  const scale = currentWordObj ? spring({
    frame: frame - (currentWordObj.start * fps),
    fps,
    config: { stiffness: 200, damping: 10 }
  }) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>

      {/* 1. VIDEO DE FONDO (Con Loop Automático) */}
      {/* Remotion hace loop automático si el componente dura más que el video */}
      <Video
        src={staticFile(`asmr/${videoFile}`)} // Asumiendo que están en public/asmr
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loop // <--- ESTO HACE LA MAGIA DEL LOOP INFINITO
        muted
      />

      {/* 2. AUDIO (Base64) */}
      <Audio src={audioData} />

      {/* 3. SUBTÍTULOS ESTILO TIKTOK */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: "40px"
      }}>
        {currentWordObj && (
          <h1 style={{
            fontFamily,
            fontSize: 90,
            color: "#FFE800", // Amarillo Paulino
            textTransform: "uppercase",
            textAlign: "center",
            fontWeight: 900,
            WebkitTextStroke: "4px black",
            textShadow: "6px 6px 0px #000",
            transform: `scale(${interpolate(scale, [0, 1], [0.8, 1])})`
          }}>
            {currentWordObj.word}
          </h1>
        )}
      </div>
    </AbsoluteFill>
  );
};
