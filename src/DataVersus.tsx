import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { z } from "zod";

const { fontFamily } = loadFont();

export const myCompSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  topic: z.string(),
  data: z.array(
    z.object({
      name: z.string(),
      flag: z.string(),
      color: z.string(),
      values: z.array(
        z.object({
          year: z.number(),
          value: z.number(),
        })
      ),
    })
  ),
});

const formatNumber = (n: number) =>
  Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export const DataVersus: React.FC<z.infer<typeof myCompSchema>> = ({
  title,
  subtitle,
  topic,
  data,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // --- TIEMPOS DINÁMICOS ---
  // Usamos porcentajes del video total para que siempre cuadre
  const INTRO_FRAMES = fps * 3;
  const OUTRO_FRAMES = fps * 3;

  // Tiempo dedicado solo a las barras
  const CHART_DURATION = durationInFrames - INTRO_FRAMES - OUTRO_FRAMES;

  // Validamos para no romper si el video es muy corto
  const safeChartDuration = Math.max(1, CHART_DURATION);

  // --- LÓGICA DE DATOS ---
  const totalYears = data[0].values.length;

  // Frame relativo dentro de la sección de gráficos
  const chartFrame = Math.max(0, frame - INTRO_FRAMES);

  // Progreso global del gráfico (0 a 1)
  const globalProgress = Math.min(1, chartFrame / safeChartDuration);

  // Calcular índice actual basado en el progreso global
  // Si progress es 0.5, estamos a la mitad de los años
  const exactIndex = globalProgress * (totalYears - 1);
  const currentIndex = Math.floor(exactIndex);
  const nextIndex = Math.min(currentIndex + 1, totalYears - 1);
  const segmentProgress = exactIndex - currentIndex; // Decimal (0.0 a 0.99)

  // Año interpolado para el fondo
  const currentYearObj = data[0].values[currentIndex];
  const nextYearObj = data[0].values[nextIndex];
  const displayYear = Math.floor(interpolate(segmentProgress, [0, 1], [currentYearObj.year, nextYearObj.year]));

  // --- ANIMACIONES VISUALES ---

  // Intro: Texto aparece y sube
  const introOpacity = interpolate(frame, [0, 30, INTRO_FRAMES - 10, INTRO_FRAMES], [0, 1, 1, 0]);
  const introScale = interpolate(frame, [0, INTRO_FRAMES], [0.9, 1.1]);

  // Chart: Aparece suavemente
  const chartOpacity = interpolate(frame, [INTRO_FRAMES, INTRO_FRAMES + 20], [0, 1]);

  // Fondo: Movimiento lento constante
  const bgMove = interpolate(frame, [0, durationInFrames], [0, -150]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        fontFamily,
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* 🌌 FONDO ANIMADO */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)`,
          transform: `scale(1.2) translateY(${bgMove}px)`,
        }}
      />

      {/* Grid decorativo */}
      <div style={{
          position: "absolute", inset: 0, opacity: 0.15,
          backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)",
          backgroundSize: "60px 60px"
      }}/>

      {/* 🪝 INTRO / HOOK (Corregido superposición) */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: introOpacity,
          transform: `scale(${introScale})`,
          padding: 40,
          textAlign: "center"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ fontSize: 50, fontWeight: 800, margin: 0, color: "#cbd5e1" }}>
              Analizando Datos:
            </h2>
            <h1 style={{
                fontSize: 70,
                fontWeight: 900,
                lineHeight: 1.1,
                background: "linear-gradient(to right, #38bdf8, #818cf8)",
                WebkitBackgroundClip: "text",
                color: "transparent",
                margin: 0
            }}>
              {topic}
            </h1>
        </div>
      </AbsoluteFill>

      {/* 📊 GRÁFICO PRINCIPAL */}
      <AbsoluteFill style={{ opacity: chartOpacity, padding: 40 }}>

        {/* AÑO GIGANTE DE FONDO */}
        <div style={{
            position: "absolute", top: "18%", width: "100%", textAlign: "center",
            fontSize: 280, fontWeight: 900, opacity: 0.08, pointerEvents: "none",
            fontVariantNumeric: "tabular-nums"
        }}>
            {displayYear}
        </div>

        {/* TÍTULOS SUPERIORES */}
        <div style={{ marginTop: 100, textAlign: "center", zIndex: 10 }}>
          <h2 style={{ fontSize: 55, margin: 0, fontWeight: 800, textShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>{title}</h2>
          <p style={{ fontSize: 32, opacity: 0.8, marginTop: 10, fontWeight: 500 }}>{subtitle}</p>
        </div>

        {/* BARRAS */}
        <div style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 60, // Más espacio entre barras
            paddingBottom: 200
        }}>
            {data.map((country) => {
                const valNow = country.values[currentIndex].value;
                const valNext = country.values[nextIndex].value;
                const currentVal = interpolate(segmentProgress, [0, 1], [valNow, valNext]);

                // Cálculo de altura relativo al máximo actual
                const maxNow = Math.max(...data.map(c => c.values[currentIndex].value));
                const maxNext = Math.max(...data.map(c => c.values[nextIndex].value));
                const currentMax = interpolate(segmentProgress, [0, 1], [maxNow, maxNext]);

                // Suavizado para que la barra no salte bruscamente
                const barHeight = (currentVal / (currentMax * 1.1)) * (height * 0.55);

                return (
                    <div key={country.name} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        width: "40%", position: "relative"
                    }}>
                        {/* Número Contador */}
                        <div style={{
                            fontSize: 60, fontWeight: 900, marginBottom: 25,
                            fontVariantNumeric: "tabular-nums",
                            textShadow: `0 0 20px ${country.color}`
                        }}>
                            {formatNumber(currentVal)}
                        </div>

                        {/* Barra con gradiente y emoji */}
                        <div style={{
                            width: "100%", height: barHeight,
                            background: `linear-gradient(180deg, ${country.color}cc 0%, ${country.color}33 100%)`,
                            borderRadius: "30px 30px 0 0",
                            borderTop: `4px solid ${country.color}`,
                            boxShadow: `0 0 40px ${country.color}44`,
                            display: "flex", justifyContent: "center", paddingTop: 30,
                            transition: "height 0.1s linear" // Ayuda a suavizar frames perdidos
                        }}>
                             <div style={{ fontSize: 100, filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.3))" }}>
                                {country.flag}
                             </div>
                        </div>

                        {/* Nombre del País */}
                        <div style={{
                            marginTop: 30, fontSize: 40, fontWeight: 800,
                            textTransform: "uppercase", letterSpacing: 1
                        }}>
                            {country.name}
                        </div>
                    </div>
                );
            })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
