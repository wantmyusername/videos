import React from 'react';
import { Composition } from "remotion";
import { QuoteVideo, quoteSchema } from "./QuoteVideo";
import { ViejoPaulino, paulinoSchema } from "./ViejoPaulino";
import "./style.css";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 1. MODO LIBRO (Tu canal principal) */}
      <Composition
        id="QuoteVideo"
        component={QuoteVideo}
        durationInFrames={360} // 12 segundos fijo
        fps={30}
        width={1080}
        height={1920}
        schema={quoteSchema}
        defaultProps={{
          text: "El éxito es ir de fracaso en fracaso.",
          author: "Winston Churchill"
        }}
      />

      {/* 2. MODO VIEJO PAULINO (Tu nuevo canal viral) */}
      <Composition
        id="ViejoPaulino"
        component={ViejoPaulino}
        durationInFrames={10} // Se calcula dinámicamente según el audio
        fps={30}
        width={1080}
        height={1920}
        schema={paulinoSchema}
        defaultProps={{
          audioData: "",
          videoFile: "video_002.mp4", // Asegúrate de tener videos en public/asmr
          captions: [
            { word: "Prueba", start: 0, end: 1 }
          ]
        }}
      />
    </>
  );
};
