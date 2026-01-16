import { AbsoluteFill, Video, Audio, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { z } from "zod";

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
  const { fps, durationInFrames } = useVideoConfig(); // Obtenemos la duración total calculada por el server

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

      {/*
          LA TIJERA MAESTRA ✂️
          Todo lo que esté aquí dentro se cortará exactamente en el frame final.
      */}
      <Sequence from={0} durationInFrames={durationInFrames}>

          {/* VIDEO DE FONDO */}
          <Video
            src={staticFile(`asmr/${videoFile}`)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loop={true}
            volume={0.2}
          />

          {/* CAPA DE CONTRASTE */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)"
          }} />

          {/* AUDIO VOZ */}
          <Audio src={audioData} volume={1.0} />

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
