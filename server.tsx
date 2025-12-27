/**
 * server.ts
 * Servidor simple para renderizar Remotion desde n8n
 */
import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Caché del bundle para que sea rápido
let bundledPath: string | null = null;

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body; // Aquí llega el JSON de n8n
    console.log("🎥 Recibiendo petición de renderizado...", inputProps.topic);

    // 1. Crear el bundle (solo la primera vez o si cambia el código)
    if (!bundledPath) {
      console.log("📦 Empaquetando código...");
      bundledPath = await bundle({
        entryPoint: path.join(process.cwd(), "src", "index.ts"),
        // Si usas Webpack overrides, agrégalos aquí
      });
    }

    // 2. Seleccionar la composición
    const composition = await selectComposition({
      serveUrl: bundledPath,
      id: "DataVersus", // ¡Asegúrate que este ID coincida con tu Root.tsx!
      inputProps,
    });

    // 3. Renderizar el video
    const tempOutput = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
    
    console.log("⚙️ Renderizando...");
    await renderMedia({
      composition,
      serveUrl: bundledPath,
      codec: "h264",
      outputLocation: tempOutput,
      inputProps,
    });

    console.log("✅ Renderizado listo. Enviando archivo...");
    
    // 4. Enviar el video como respuesta
    res.download(tempOutput, (err) => {
      if (err) console.error(err);
      // Borrar archivo temporal después de enviar
      fs.unlinkSync(tempOutput);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Renderizado escuchando en puerto ${PORT}`);
});
