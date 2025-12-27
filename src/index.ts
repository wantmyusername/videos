import { registerRoot } from "remotion";
import { Composition } from "remotion";
import { QuoteVideo, quoteSchema } from "./QuoteVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="QuoteVideo"
      component={QuoteVideo}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
      schema={quoteSchema}
      defaultProps={{
        text: "La paciencia es amarga, pero su fruto es dulce.",
        author: "Jean-Jacques Rousseau"
      }}
    />
  );
};

registerRoot(RemotionRoot);
