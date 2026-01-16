import React from 'react';
import { Composition } from "remotion";
import { QuoteVideo, quoteSchema } from "./QuoteVideo";
import { ViejoPaulino, paulinoSchema } from "./ViejoPaulino";
import "./style.css";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuoteVideo"
        component={QuoteVideo}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
        schema={quoteSchema}
        defaultProps={{
          text: "El éxito es ir de fracaso en fracaso.",
          author: "Winston Churchill"
        }}
      />

      <Composition
        id="ViejoPaulino"
        component={ViejoPaulino}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={paulinoSchema}
        defaultProps={{
          audioUrl: "", // <--- Ahora usamos URL
          videoFile: "video_001.mp4",
          captions: [
            { word: "Prueba", start: 0, end: 1 }
          ]
        }}
      />
    </>
  );
};
