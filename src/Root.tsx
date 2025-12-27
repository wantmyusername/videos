import { Composition } from "remotion";
// 👇 AQUÍ ESTABA EL ERROR. Ahora importamos desde el archivo nuevo:
import { DataVersus, myCompSchema } from "./DataVersus";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DataVersus"
        component={DataVersus}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={myCompSchema}
        defaultProps={{
          title: "Demo Mode",
          subtitle: "Esperando a OpenAI...",
          topic: "demo",
          data: [{
            name: "Loading...",
            flag: "⏳",
            color: "#fff",
            values: [{year: 2024, value: 100}]
          }]
        }}
      />
    </>
  );
};
