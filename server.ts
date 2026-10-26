import "dotenv/config";
import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";
import os from "os";

const chromeOptions = {
  // En Contabo (Linux sin monitor) usar REMOTION_GL=angle o swangle + xvfb.
  gl: (process.env.REMOTION_GL ?? "angle") as
    | "swangle"
    | "angle"
    | "egl"
    | "swiftshader"
    | "vulkan"
    | "angle-egl",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "50mb" }));

// IMPORTANTE: Servir las carpetas de audio para que Remotion pueda leer los MP3 locales
app.use("/tmp", express.static(os.tmpdir()));

const SHARED_DIR = process.env.SHARED_DIR ?? "/shared";
const MAPS_DIR = path.join(SHARED_DIR, "maps");
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLE =
  process.env.MAPBOX_STYLE ?? "mapbox/navigation-night-v1";
const MAPBOX_PADDING = Number(process.env.MAPBOX_PADDING ?? 0.55);
const MAP_ATTRIBUTION = "© Mapbox © OpenStreetMap contributors";
const MERCATOR_LAT_LIMIT = 85.05112878;

try {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
  app.use("/shared", express.static(SHARED_DIR));
} catch (error) {
  console.warn("No se pudo preparar SHARED_DIR:", error);
}

const PORT = process.env.PORT || 8000;
let bundledPath: string | null = null;

const normalizeAssetUrl = (
  value: unknown,
  req: express.Request,
): unknown => {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }

  if (/^(https?:|data:|blob:)/.test(value)) {
    return value;
  }

  const base =
    process.env.PUBLIC_BASE_URL ?? `${req.protocol}://${req.get("host")}`;

  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const mercatorPoint = (lng: number, lat: number) => {
  const clampedLat = clamp(lat, -MERCATOR_LAT_LIMIT, MERCATOR_LAT_LIMIT);
  const sin = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
};

const latFromMercatorY = (y: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

const isLatLng = (value: unknown): value is { lat: number; lng: number } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as { lat?: unknown; lng?: unknown };

  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng) &&
    point.lng >= -180 &&
    point.lng <= 180
  );
};

const buildMapBbox = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  width: number,
  height: number,
  padding: number,
): [number, number, number, number] => {
  const from = mercatorPoint(origin.lng, origin.lat);
  const to = mercatorPoint(destination.lng, destination.lat);
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  const centerX = (minX + maxX) / 2;
  const aspect = width / height;
  const routeSpanX = Math.max(maxX - minX, 0.0005);
  const routeSpanY = Math.max(maxY - minY, 0.0005);
  const paddedSpanX = routeSpanX * (1 + padding * 2);
  const paddedSpanY = routeSpanY * (1 + padding * 2);
  const spanX = Math.max(paddedSpanX, paddedSpanY * aspect, 0.0006);
  const spanY = spanX / aspect;
  const minBoundsX = centerX - spanX / 2;
  const maxBoundsX = centerX + spanX / 2;
  const rawCenterY = (minY + maxY) / 2;
  const centerY =
    spanY < 1 ? clamp(rawCenterY, spanY / 2, 1 - spanY / 2) : 0.5;
  const minBoundsY = clamp(centerY - spanY / 2, 0, 1);
  const maxBoundsY = clamp(centerY + spanY / 2, 0, 1);

  return [
    minBoundsX * 360 - 180,
    latFromMercatorY(maxBoundsY),
    maxBoundsX * 360 - 180,
    latFromMercatorY(minBoundsY),
  ];
};

const resolveCompositionId = (inputProps: Record<string, unknown>) => {
  if (typeof inputProps.compositionId === "string" && inputProps.compositionId) {
    return inputProps.compositionId;
  }

  return "FlightVideo";
};

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    compositionIds: ["FlightVideo"],
    mapboxConfigured: Boolean(MAPBOX_ACCESS_TOKEN),
  });
});

app.post("/map", async (req, res) => {
  try {
    if (!MAPBOX_ACCESS_TOKEN) {
      res.status(500).json({
        error: "MAPBOX_ACCESS_TOKEN no está configurado",
      });
      return;
    }

    const body = req.body ?? {};
    const { origin, destination } = body;

    if (!isLatLng(origin) || !isLatLng(destination)) {
      res.status(400).json({
        error: "origin y destination deben incluir lat y lng válidos",
      });
      return;
    }

    const width = Math.round(
      clamp(Number(body.width) || 720, 64, 1280),
    );
    const height = Math.round(
      clamp(Number(body.height) || 1280, 64, 1280),
    );
    const padding = clamp(Number(body.padding ?? MAPBOX_PADDING), 0, 1);
    const scale = Number(body.scale) === 1 ? 1 : 2;
    const requestedStyle =
      typeof body.style === "string" ? body.style : MAPBOX_STYLE;
    const style = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(requestedStyle)
      ? requestedStyle
      : MAPBOX_STYLE;
    const bbox = buildMapBbox(
      origin,
      destination,
      width,
      height,
      padding,
    );
    const hash = createHash("sha1")
      .update(
        JSON.stringify({
          origin,
          destination,
          style,
          width,
          height,
          scale,
          padding,
        }),
      )
      .digest("hex")
      .slice(0, 16);
    const filename = `map-${hash}.png`;
    const outputPath = path.join(MAPS_DIR, filename);
    const cached = fs.existsSync(outputPath);

    if (!cached) {
      const mapboxUrl = `https://api.mapbox.com/styles/v1/${style}/static/[${bbox.join(
        ",",
      )}]/${width}x${height}${scale === 2 ? "@2x" : ""}?access_token=${encodeURIComponent(
        MAPBOX_ACCESS_TOKEN,
      )}&logo=false&attribution=false`;
      const response = await fetch(mapboxUrl);

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Mapbox ${response.status}: ${detail.slice(0, 200)}`,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(outputPath, buffer);
    }

    const base =
      process.env.PUBLIC_BASE_URL ??
      `${req.protocol}://${req.get("host")}`;
    const mapImageUrl = new URL(
      `/shared/maps/${filename}`,
      base,
    ).toString();

    res.json({
      mapImageUrl,
      mapBbox: bbox,
      mapAttribution: MAP_ATTRIBUTION,
      mapStyle: style,
      mapWidth: width * scale,
      mapHeight: height * scale,
      cached,
    });
  } catch (err) {
    console.error("🔥 Error mapa:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body ?? {};
    inputProps.audioUrl = normalizeAssetUrl(inputProps.audioUrl, req);
    inputProps.bgMusicUrl = normalizeAssetUrl(inputProps.bgMusicUrl, req);
    inputProps.mapImageUrl = normalizeAssetUrl(inputProps.mapImageUrl, req);

    const compositionId = resolveCompositionId(inputProps);

    console.log(`🎬 Petición recibida. Composición: ${compositionId}`);

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
      inputProps,
      chromiumOptions: chromeOptions,
    });

    const durationInFrames =
      Number(inputProps.durationInFrames) > 0
        ? Math.ceil(Number(inputProps.durationInFrames))
        : composition.durationInFrames;

    const tempOutput = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

    console.log(
      `⚙️ Renderizando ${compositionId}: ${durationInFrames} frames @ ${composition.fps} FPS...`,
    );

    await renderMedia({
      serveUrl: bundledPath,
      composition: {
        ...composition,
        durationInFrames,
      },
      codec: "h264",
      outputLocation: tempOutput,
      inputProps,
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
        if (
          typeof inputProps.audioUrl === "string" &&
          inputProps.audioUrl.includes("/tmp/")
        ) {
          const audioFile = inputProps.audioUrl.split("/").pop();
          const audioPath = path.join(os.tmpdir(), audioFile ?? "");
          if (audioFile && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        }
      } catch (e) {
        console.error(e);
      }
    });
  } catch (err) {
    console.error("🔥 Error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Motor listo en puerto ${PORT}`);
});
