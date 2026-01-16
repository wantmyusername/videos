import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
import { ASMR_VIDEOS } from "./src/assets";

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 8000;
let bundledPath: string | null = null;

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;
    const requestType = inputProps.type || "book";
    const FPS = 30;

    console.log(`🎬 Petición recibida. Tipo: ${requestType}`);

    // --- CONFIGURACIÓN POR DEFECTO (MODO LIBRO) ---
    // No tocamos nada aquí. Si no entra al if de abajo, esto es lo que se renderiza.
    let compositionId = "QuoteVideo";
    let durationInFrames = 360; // 12 segundos exactos (12 * 30)
    let finalProps = { ...inputProps };

    // --- MODO: VIEJO PAULINO (ASMR) ---
    if (requestType === "viejopaulino") {
      compositionId = "ViejoPaulino";

      // 1. Video Random
      const randomVideo = ASMR_VIDEOS[Math.floor(Math.random() * ASMR_VIDEOS.length)];

      // 2. CÁLCULO DE DURACIÓN (Debuggeado)
      // Imprimimos en los logs qué estamos recibiendo para ver si n8n manda el dato
      console.log(`⏱ Datos de tiempo recibidos -> Duration: ${inputProps.durationInSeconds}, Captions: ${inputProps.captions?.length}`);

      let audioSeconds = 0;

      if (inputProps.durationInSeconds) {
          // Opción A: n8n nos mandó el tiempo exacto (Whisper)
          audioSeconds = Number(inputProps.durationInSeconds);
      } else if (inputProps.captions && inputProps.captions.length > 0) {
          // Opción B: Calculamos por la última palabra
          const lastWord = inputProps.captions[inputProps.captions.length - 1];
          audioSeconds = lastWord.end;
      } else {
          // Opción C: Fallo total (Fallback)
          console.log("⚠️ ALERTA: No se encontró duración. Usando default 10s.");
          audioSeconds = 10;
      }

      // +0.5 segundos de margen para que no se corte la voz
      durationInFrames = Math.ceil((audioSeconds + 0.5) * FPS);

      console.log(`✅ Duración calculada: ${audioSeconds}s -> ${durationInFrames} frames`);

      finalProps = {
        ...inputProps,
        videoFile: randomVideo,
      };
    }

    // --- EMPAQUETADO Y RENDER ---
    if (!bundledPath) {
      console.log("📦 Empaquetando...");
      bundledPath = await bundle({
        entryPoint: path.join(process.cwd(), "src", "index.ts"),
      });
    }

    const composition = await selectComposition({
      serveUrl: bundledPath,
      id: compositionId,
      inputProps: finalProps,
    });

    const tempOutput = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

    console.log(`⚙️ Renderizando ${compositionId} a ${durationInFrames} frames...`);

    await renderMedia({
      // Usamos los parámetros explícitos
      serveUrl: bundledPath,
      composition: {
        ...composition,
        durationInFrames: durationInFrames, // SOBRESCRIBIMOS A LA FUERZA AQUÍ
      },
      codec: "h264",
      outputLocation: tempOutput,
      inputProps: finalProps,
      // Y también lo pasamos acá por si acaso (doble candado)
      durationInFrames: durationInFrames,
      fps: FPS,
    });

    console.log("✅ Video listo. Enviando...");

    res.download(tempOutput, (err) => {
      if (err) console.error(err);
      try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch(e){}
    });

  } catch (err) {
    console.error("🔥 Error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Motor listo en puerto ${PORT}`);
});
