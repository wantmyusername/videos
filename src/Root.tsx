import React from 'react';
import { Composition } from "remotion";
import { QuoteVideo, quoteSchema } from "./QuoteVideo";
import "./style.css"; // (Opcional, si tienes estilos)

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
          text: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.",
          author: "Winston Churchill"
        }}
      />
    </>
  );
};
