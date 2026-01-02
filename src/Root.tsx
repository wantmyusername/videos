import React from 'react';
import { Composition } from "remotion";
import { QuoteVideo, quoteSchema } from "./QuoteVideo";
import { CinematicQuote, cinematicSchema } from "./CinematicQuote"; // <--- Importamos el nuevo componente
import "./style.css";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 1. Composición del Libro (La original) */}
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

      {/* 2. Composición Cinemática (La nueva) */}
      <Composition
        id="CinematicQuote"
        component={CinematicQuote}
        durationInFrames={300} // Este valor es solo default, el servidor lo sobrescribe según el video
        fps={30}
        width={1080}
        height={1920}
        schema={cinematicSchema}
        defaultProps={{
          text: "Ejemplo de texto cinemático",
          author: "Anónimo",
          videoFile: "video_00001.mp4", // Asegúrate que este nombre coincida con uno real de tu carpeta
          musicFile: "music_00001.mp3"
        }}
      />
    </>
  );
};
