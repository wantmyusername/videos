import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";

const chromeOptions = {
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

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
    const FPS = 24;

    console.log(`🎬 Petición recibida. Tipo: ${requestType}`);

    let compositionId = "QuoteVideo";
    let durationInFrames = 360;
    let finalProps: any = { ...inputProps };

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
      concurrency: Math.min(os.cpus().length, 2),
      chromiumOptions: chromeOptions,
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
