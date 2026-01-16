/**
 * server.ts
 * Motor de Renderizado Central
 * Modos: Libro (Default) | Viejo Paulino (ASMR)
 */
import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
import { ASMR_VIDEOS } from "./src/assets";

const app = express();
// Límite alto para recibir audios en base64
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 8000;
let bundledPath: string | null = null;

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;
    const requestType = inputProps.type || "book"; // Default: Libro
    console.log(`🎬 Petición: ${requestType}`);

    const FPS = 30;

    // Configuración Inicial
    let compositionId = "QuoteVideo"; // ID del componente Libro en Root.tsx
    let durationInFrames = 12 * FPS;  // Duración fija del Libro
    let finalProps = { ...inputProps };

    // --- MODO: VIEJO PAULINO (ASMR) ---
    if (requestType === "viejopaulino") {
      compositionId = "ViejoPaulino"; // ID del componente Paulino en Root.tsx

      // 1. Elegir video de fondo al azar
      const randomVideo = ASMR_VIDEOS[Math.floor(Math.random() * ASMR_VIDEOS.length)];

      // 2. Calcular duración exacta basada en el audio/subtítulos
      // n8n debe mandar 'captions' con start/end
      const captions = inputProps.captions || [];
      const lastWord = captions[captions.length - 1];
      const audioEndTime = lastWord ? lastWord.end : 10;

      // +1.5 seg de margen al final
      durationInFrames = Math.ceil((audioEndTime + 1.5) * FPS);

      finalProps = {
        ...inputProps,
        videoFile: randomVideo,
      };
    }

    // --- MODO: LIBRO (Default) ---
    // No hace falta 'else', ya está configurado arriba como default.
    // El libro usa 'QuoteVideo' y dura 12s fijos.

    // --- RENDERIZADO ---
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

    console.log(`⚙️ Renderizando ${compositionId} (${durationInFrames} frames)...`);

    await renderMedia({
      composition,
      serveUrl: bundledPath,
      codec: "h264",
      outputLocation: tempOutput,
      inputProps: finalProps,
      durationInFrames: durationInFrames,
      fps: FPS,
    });

    console.log("✅ Enviando video...");

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
  console.log(`🚀 Motor de Video listo en puerto ${PORT}`);
});
