/**
 * server.ts
 * Servidor corregido para Quotes
 */
import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";

// 1. INICIALIZAR APP PRIMERO (Esto faltaba o estaba mal ubicado)
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Caché del bundle
let bundledPath: string | null = null;

// 2. DEFINIR RUTA
app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;
    console.log("📜 Recibiendo petición de frase...");

    // Configuración para Video de Frases (12 segundos)
    const FPS = 30;
    const durationInFrames = 12 * FPS;

    // Bundlear si no existe
    if (!bundledPath) {
      console.log("📦 Empaquetando...");
      bundledPath = await bundle({
        entryPoint: path.join(process.cwd(), "src", "index.ts"),
      });
    }

    // Seleccionar composición
    const composition = await selectComposition({
      serveUrl: bundledPath,
      id: "QuoteVideo", // ID del componente de Frases
      inputProps,
    });

    const tempOutput = path.join(os.tmpdir(), `quote-${Date.now()}.mp4`);

    console.log("⚙️ Renderizando...");
    await renderMedia({
      composition,
      serveUrl: bundledPath,
      codec: "h264",
      outputLocation: tempOutput,
      inputProps,
      durationInFrames, // Duración forzada
    });

    console.log("✅ Listo. Enviando...");

    res.download(tempOutput, (err) => {
      if (err) console.error(err);
      try {
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch (e) {
        console.error("Error borrando temp:", e);
      }
    });

  } catch (err) {
    console.error("🔥 Error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. ARRANCAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
