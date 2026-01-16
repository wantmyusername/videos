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
    let durationInFrames = 12 * FPS;  // Duración fija del Libro (12s)
    let finalProps = { ...inputProps };

    // --- MODO: VIEJO PAULINO (ASMR) ---
    if (requestType === "viejopaulino") {
      compositionId = "ViejoPaulino"; // ID del componente Paulino en Root.tsx

      // 1. Elegir video de fondo al azar
      const randomVideo = ASMR_VIDEOS[Math.floor(Math.random() * ASMR_VIDEOS.length)];

      // 2. LÓGICA DE DURACIÓN INTELIGENTE 🧠
      let audioDuration = 10; // Default de seguridad

      // Prioridad A: Si n8n nos mandó la duración exacta (uso de Whisper)
      if (inputProps.durationInSeconds) {
          audioDuration = inputProps.durationInSeconds;
      }
      // Prioridad B: Si no, calculamos por la última palabra (Fallback)
      else if (inputProps.captions && inputProps.captions.length > 0) {
          const lastWord = inputProps.captions[inputProps.captions.length - 1];
          audioDuration = lastWord.end;
      }

      // 3. Duración exacta + 0.5s de "aire" para que no se corte feo
      durationInFrames = Math.ceil((audioDuration + 0.5) * FPS);

      finalProps = {
        ...inputProps,
        videoFile: randomVideo,
      };
    }

    // --- MODO: LIBRO (Default) ---
    // Pasa directo con durationInFrames = 360 (12s) y compositionId = QuoteVideo

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
