import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
import { ASMR_VIDEOS } from "./src/assets";

const app = express();
app.use(express.json({ limit: "50mb" }));

// IMPORTANTE: Servir la carpeta temporal para que Remotion pueda leer los MP3 locales
app.use("/tmp", express.static(os.tmpdir()));

const PORT = process.env.PORT || 8000;
let bundledPath: string | null = null;

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;
    const requestType = inputProps.type || "book";
    const FPS = 30;

    console.log(`🎬 Petición recibida. Tipo: ${requestType}`);

    let compositionId = "QuoteVideo";
    let durationInFrames = 360;
    let finalProps: any = { ...inputProps };

    // --- MODO: VIEJO PAULINO (ASMR) ---
    if (requestType === "viejopaulino") {
      compositionId = "ViejoPaulino";

      // 1. Video Random
      const randomVideo = ASMR_VIDEOS[Math.floor(Math.random() * ASMR_VIDEOS.length)];

      // 2. GUARDAR AUDIO EN DISCO (Optimización de RAM) 💾
      // Convertimos el base64 a un archivo físico
      const base64Data = inputProps.audioData.replace(/^data:audio\/mp3;base64,/, "");
      const audioFileName = `audio-${Date.now()}.mp3`;
      const audioPath = path.join(os.tmpdir(), audioFileName);

      fs.writeFileSync(audioPath, base64Data, 'base64');

      // Creamos la URL local para que Remotion la lea
      const audioUrl = `http://localhost:${PORT}/tmp/${audioFileName}`;

      // 3. CÁLCULO DE DURACIÓN
      let audioSeconds = 10; // Default

      if (inputProps.durationInSeconds) {
          audioSeconds = Number(inputProps.durationInSeconds);
      } else if (inputProps.captions && inputProps.captions.length > 0) {
          const lastWord = inputProps.captions[inputProps.captions.length - 1];
          audioSeconds = lastWord.end;
      }

      durationInFrames = Math.ceil((audioSeconds + 0.5) * FPS);
      console.log(`✅ Duración: ${audioSeconds}s -> ${durationInFrames} frames`);

      // 4. Props finales (Pasamos la URL, borramos el base64 pesado)
      finalProps = {
        ...inputProps,
        videoFile: randomVideo,
        audioUrl: audioUrl,
        audioData: undefined // Liberar memoria
      };
    }

    // --- RENDER ---
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
      serveUrl: bundledPath,
      composition: {
        ...composition,
        durationInFrames: durationInFrames, // Forzamos duración
      },
      codec: "h264",
      outputLocation: tempOutput,
      inputProps: finalProps,
      durationInFrames: durationInFrames,
      fps: FPS,
      concurrency: os.cpus().length, // Usa todos los núcleos para ir más rápido
    });

    console.log("✅ Video listo. Enviando...");

    res.download(tempOutput, (err) => {
      if (err) console.error(err);
      // Limpieza: Borrar video Y borrar el audio temporal
      try {
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

        // Si generamos un audio temporal, lo borramos
        if (finalProps.audioUrl && finalProps.audioUrl.includes("/tmp/")) {
            const audioFile = finalProps.audioUrl.split('/').pop();
            const audioPath = path.join(os.tmpdir(), audioFile);
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        }
      } catch(e){}
    });

  } catch (err) {
    console.error("🔥 Error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Motor listo en puerto ${PORT}`);
});
