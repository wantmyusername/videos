import { AbsoluteFill, Video, Audio, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { z } from "zod";

const { fontFamily } = loadFont();

export const paulinoSchema = z.object({
  audioUrl: z.string(), // <--- CAMBIO: Recibe URL, no string gigante
  videoFile: z.string(),
  captions: z.array(z.object({
    word: z.string(),
    start: z.number(),
    end: z.number()
  }))
});

export const ViejoPaulino: React.FC<z.infer<typeof paulinoSchema>> = ({
  audioUrl, videoFile, captions
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 1. Lógica de Subtítulos
  const currentTime = frame / fps;
  const currentWordObj = captions.find(c => currentTime >= c.start && currentTime <= c.end);

  // 2. Animación
  const scale = currentWordObj ? spring({
    frame: frame - (currentWordObj.start * fps),
    fps,
    config: { stiffness: 300, damping: 15 }
  }) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>

      {/* TIJERA DE TIEMPO EXACTO */}
      <Sequence from={0} durationInFrames={durationInFrames}>

          {/* VIDEO FONDO */}
          <Video
            src={staticFile(`asmr/${videoFile}`)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loop={true}
            volume={0.2}
          />

          {/* CAPA OSCURA */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)"
          }} />

          {/* AUDIO DESDE ARCHIVO LOCAL (Carga instantánea) */}
          <Audio src={audioUrl} volume={1.0} />

          {/* SUBTÍTULOS */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: "25%",
            paddingLeft: "10%",
            paddingRight: "10%"
          }}>
            {currentWordObj && (
              <h1 style={{
                fontFamily,
                fontSize: 90,
                color: "white",
                textTransform: "uppercase",
                textAlign: "center",
                fontWeight: "normal",
                WebkitTextStroke: "2px black",
                textShadow: "4px 4px 0px rgba(0,0,0,1)",
                transform: `scale(${interpolate(scale, [0, 1], [0.8, 1])})`,
                margin: 0,
                lineHeight: 1
              }}>
                {currentWordObj.word}
              </h1>
            )}
          </div>

      </Sequence>

    </AbsoluteFill>
  );
};
