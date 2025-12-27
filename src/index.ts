import { registerRoot } from "remotion";
import { Composition } from "remotion";
import { QuoteVideo, quoteSchema } from "./QuoteVideo";
import "./style.css"; // Si tienes estilos globales

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuoteVideo" // Nuevo ID
        component={QuoteVideo}
        durationInFrames={360} // 12 segundos a 30fps (Perfecto para Stories)
        fps={30}
        width={1080}
        height={1920}
        schema={quoteSchema}
        defaultProps={{
          text: "Se que a veces te fallo con mis actitudes, pero créeme que no quiero otra mujer que no seas tú.",
          author: "@mi.escrito"
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
