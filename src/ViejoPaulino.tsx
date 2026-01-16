import { AbsoluteFill, Video, Audio, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { z } from "zod";

// Schema de datos
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

  // Buscar palabra actual
  const currentTime = frame / fps;
  const currentWordObj = captions.find(c => currentTime >= c.start && currentTime <= c.end);

  // Animación POP (Rebote)
  const scale = currentWordObj ? spring({
    frame: frame - (currentWordObj.start * fps),
    fps,
    config: { stiffness: 300, damping: 15 }
  }) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>

      {/* VIDEO FONDO */}
      <Video
        src={staticFile(`asmr/${videoFile}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loop
        muted
      />

      {/* CAPA OSCURA */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.2)" }} />

      {/* AUDIO */}
      <Audio src={audioData} />

      {/* SUBTÍTULOS KARAOKE */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: "40px"
      }}>
        {currentWordObj && (
          <h1 style={{
            fontFamily: "'Montserrat', sans-serif", // Fuente del CSS
            fontSize: 85, // Gigante
            color: "#FFE800", // Amarillo Viral
            textTransform: "uppercase",
            textAlign: "center",
            fontWeight: 900, // Extra Bold

            // BORDE NEGRO
            WebkitTextStroke: "3px black",
            textShadow: "4px 4px 0px rgba(0,0,0,1)",

            // ANIMACIÓN
            transform: `scale(${interpolate(scale, [0, 1], [0.8, 1])})`,
            margin: 0
          }}>
            {currentWordObj.word}
          </h1>
        )}
      </div>
    </AbsoluteFill>
  );
};
