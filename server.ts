/**
 * server.ts
 * Servidor optimizado con duración dinámica
 */
import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";

const app = express();
app.use(express.json({ limit: "10mb" })); // Aumenté el límite por si el JSON es grande

const PORT = process.env.PORT || 8000;

// Caché del bundle para que sea rápido (Singleton)
let bundledPath: string | null = null;

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;

    // Log para ver qué está pasando en Easypanel
    console.log(`🎥 Nueva petición: "${inputProps.title}" - ${inputProps.topic}`);

    // --- 1. CÁLCULO DINÁMICO DE DURACIÓN ---
    const FPS = 30;
    const SECONDS_PER_YEAR = 2.5; // Ajustable: 2.5s por año para que sea más "atrapable"
    const INTRO_SECONDS = 3; // Tiempo para leer la pregunta
    const OUTRO_SECONDS = 3; // Tiempo para ver el resultado final

    // Contamos cuántos años de datos vienen en el JSON
    // Si falla la lectura, asumimos 5 años por defecto
    const numberOfYears = inputProps.data?.[0]?.values?.length || 5;

    // Fórmula maestra de frames
    const durationInFrames = Math.floor(
      ((numberOfYears * SECONDS_PER_YEAR) + INTRO_SECONDS + OUTRO_SECONDS) * FPS
    );

    console.log(`⏱️ Duración calculada: ${numberOfYears} años = ${durationInFrames} frames (~${durationInFrames/FPS} segs)`);
    // ---------------------------------------

    // --- 2. EMPAQUETADO (Solo la primera vez) ---
    if (!bundledPath) {
      console.log("📦 Empaquetando código (Build inicial)...");
      bundledPath = await bundle({
        entryPoint: path.join(process.cwd(), "src", "index.ts"),
        // Optimizaciones de Webpack por defecto
      });
    }

    // --- 3. SELECCIÓN DE COMPOSICIÓN ---
    const composition = await selectComposition({
      serveUrl: bundledPath,
      id: "DataVersus",
      inputProps,
    });

    // --- 4. RENDERIZADO ---
    const tempOutput = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

    console.log("⚙️ Renderizando video...");

    await renderMedia({
      composition,
      serveUrl: bundledPath,
      codec: "h264",
      outputLocation: tempOutput,
      inputProps,
      // AQUÍ OCURRE LA MAGIA: Sobrescribimos la duración del Root.tsx
      durationInFrames: durationInFrames,
      fps: FPS,
    });

    console.log("✅ Renderizado exitoso. Enviando binario...");

    // --- 5. ENVIAR Y LIMPIAR ---
    res.download(tempOutput, (err) => {
      if (err) {
        console.error("❌ Error al enviar archivo:", err);
      }
      // Borrar el archivo temporal para no llenar el disco del VPS
      try {
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch (e) {
        console.error("No se pudo borrar el temporal:", e);
      }
    });

  } catch (err) {
    console.error("🔥 Error crítico:", err);
    res.status(500).json({
      error: "Error renderizando video",
      details: (err as Error).message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API de Video lista en puerto ${PORT}`);
});
