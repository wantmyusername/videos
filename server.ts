/**
 * server.ts
 * Servidor Híbrido: Libro vs. Cinemático
 */
import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";

// Importamos el inventario de assets (Asegúrate de haber creado src/assets.ts)
// Nota: Usamos require o import dinámico si ts-node se queja, pero esto debería funcionar en tu setup actual.
import { VIDEO_ASSETS, MUSIC_ASSETS } from "./src/assets";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;

let bundledPath: string | null = null;

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;
    console.log(`🎬 Petición recibida: ${inputProps.text?.substring(0, 20)}...`);

    const FPS = 30;

    // --- LÓGICA DE DECISIÓN (50% Libro / 50% Cine) ---
    const isCinematic = Math.random() > 0.1;

    let compositionId = "QuoteVideo"; // Por defecto: Libro
    let durationInFrames = 12 * FPS;  // Por defecto: 12 segs
    let finalProps = { ...inputProps }; // Copia de props

    if (isCinematic) {
      console.log("🌊 Modo: CINEMÁTICO");
      compositionId = "CinematicQuote";

      // 1. Elegir Video al Azar
      const randomVideo = VIDEO_ASSETS[Math.floor(Math.random() * VIDEO_ASSETS.length)];

      // 2. Elegir Música al Azar
      const randomMusic = MUSIC_ASSETS[Math.floor(Math.random() * MUSIC_ASSETS.length)];

      // 3. Ajustar Duración a la del video (para que no se corte ni quede negro)
      // Si no hay duración definida, usamos 15s por seguridad
      const videoDuration = randomVideo.durationInSeconds || 15;
      durationInFrames = Math.floor(videoDuration * FPS);

      // 4. Inyectar los nombres de archivo a las props
      finalProps = {
        ...inputProps,
        videoFile: randomVideo.file,
        musicFile: randomMusic
      };

    } else {
      console.log("📖 Modo: LIBRO CLÁSICO");
      // El modo libro usa la duración fija de 12s y los defaults de QuoteVideo
    }

    // --- BUNDLE (Solo una vez) ---
    if (!bundledPath) {
      console.log("📦 Empaquetando...");
      bundledPath = await bundle({
        entryPoint: path.join(process.cwd(), "src", "index.ts"),
      });
    }

    // --- SELECCIÓN ---
    const composition = await selectComposition({
      serveUrl: bundledPath,
      id: compositionId, // ID Dinámico (QuoteVideo o CinematicQuote)
      inputProps: finalProps, // Props con video/musica inyectados
    });

    // --- RENDER ---
    const tempOutput = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

    console.log(`⚙️ Renderizando ${compositionId} (${durationInFrames} frames)...`);

    await renderMedia({
      composition,
      serveUrl: bundledPath,
      codec: "h264",
      outputLocation: tempOutput,
      inputProps: finalProps,
      durationInFrames: durationInFrames, // Duración dinámica
      fps: FPS,
    });

    console.log("✅ Listo. Enviando...");

    res.download(tempOutput, (err) => {
      if (err) console.error(err);
      try {
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch (e) {
        console.error("Error limpieza:", e);
      }
    });

  } catch (err) {
    console.error("🔥 Error Fatal:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Híbrido listo en puerto ${PORT}`);
});
