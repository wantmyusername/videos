import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Audio,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { z } from "zod";

// Cargamos una fuente profesional
const { fontFamily } = loadFont();

// 1. DEFINIR EL SCHEMA (Para que n8n sepa qué enviar)
export const myCompSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  topic: z.string(), // Para el Hook
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
  const { fps, width, height } = useVideoConfig();

  // --- CONFIGURACIÓN DE TIEMPO ---
  const HOOK_DURATION = fps * 2.5; // 2.5 segundos para leer la pregunta
  const YEAR_DURATION = fps * 1.5; // Tiempo entre cada "año" de datos

  // Total de puntos de datos (asumimos que ambos países tienen la misma cantidad)
  const totalDataPoints = data[0].values.length;

  // Calcular en qué punto de la data estamos
  // Empezamos a contar DESPUÉS del hook
  const dataFrame = Math.max(0, frame - HOOK_DURATION);
  const dataProgress = dataFrame / (totalDataPoints * YEAR_DURATION);

  // Índice actual (0, 1, 2...)
  const currentIndex = Math.floor(dataFrame / YEAR_DURATION);
  const nextIndex = Math.min(currentIndex + 1, totalDataPoints - 1);

  // Progreso suave entre el año actual y el siguiente (0 a 1)
  const segmentProgress = interpolate(
    dataFrame % YEAR_DURATION,
    [0, YEAR_DURATION],
    [0, 1],
    { easing: Easing.linear, extrapolateRight: "clamp" }
  );

  // Determinar el año actual interpolado (para mostrar en el fondo)
  const currentYearObj = data[0].values[Math.min(currentIndex, totalDataPoints-1)];
  const nextYearObj = data[0].values[nextIndex];
  const displayYear = Math.floor(interpolate(segmentProgress, [0, 1], [currentYearObj.year, nextYearObj.year]));

  // --- ANIMACIONES DEL HOOK ---
  const hookOpacity = interpolate(frame, [HOOK_DURATION - 10, HOOK_DURATION], [1, 0]);
  const contentOpacity = interpolate(frame, [HOOK_DURATION, HOOK_DURATION + 15], [0, 1]);
  const bgMove = interpolate(frame, [0, 1000], [0, -100]); // Movimiento sutil del fondo

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

      {/* Grid sutil decorativo */}
      <div style={{
          position: "absolute", inset: 0, opacity: 0.1,
          backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)",
          backgroundSize: "40px 40px"
      }}/>

      {/* 🪝 HOOK (Intro llamativa) */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
          opacity: hookOpacity,
          display: frame > HOOK_DURATION ? 'none' : 'flex'
        }}
      >
        <h1 style={{
            fontSize: 70,
            textAlign: "center",
            fontWeight: 900,
            lineHeight: 1.1,
            textShadow: "0 0 20px rgba(56, 189, 248, 0.5)"
        }}>
          ¿Qué país domina en <br/>
          <span style={{
              background: "linear-gradient(to right, #38bdf8, #818cf8)",
              WebkitBackgroundClip: "text",
              color: "transparent"
          }}>
            {topic}?
          </span>
        </h1>
      </AbsoluteFill>

      {/* 📊 CONTENIDO PRINCIPAL */}
      <AbsoluteFill style={{ opacity: contentOpacity, padding: 40 }}>

        {/* AÑO DE FONDO GIGANTE */}
        <div style={{
            position: "absolute",
            top: "15%",
            left: 0,
            width: "100%",
            textAlign: "center",
            fontSize: 250,
            fontWeight: 900,
            opacity: 0.05,
            pointerEvents: "none"
        }}>
            {displayYear}
        </div>

        {/* TÍTULOS */}
        <div style={{ marginTop: 80, textAlign: "center", zIndex: 10 }}>
          <h2 style={{ fontSize: 48, margin: 0, fontWeight: 800 }}>{title}</h2>
          <p style={{ fontSize: 28, opacity: 0.7, margin: "10px 0" }}>{subtitle}</p>
        </div>

        {/* BARRAS DE COMPARACIÓN */}
        <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "row", // Ponemos uno al lado del otro
            alignItems: "flex-end", // Crecen desde abajo
            justifyContent: "center",
            gap: 40,
            paddingBottom: 150
        }}>
            {data.map((country, i) => {
                // Lógica de interpolación de valores
                const valNow = country.values[Math.min(currentIndex, totalDataPoints-1)].value;
                const valNext = country.values[nextIndex].value;
                const currentVal = interpolate(segmentProgress, [0, 1], [valNow, valNext]);

                // Calcular máximo global actual para escalar las barras dinámicamente
                const maxValNow = Math.max(...data.map(c => c.values[Math.min(currentIndex, totalDataPoints-1)].value));
                const maxValNext = Math.max(...data.map(c => c.values[nextIndex].value));
                const currentMax = interpolate(segmentProgress, [0, 1], [maxValNow, maxValNext]);

                // Altura relativa (máximo 60% de la pantalla)
                const barHeight = (currentVal / (currentMax * 1.2)) * (height * 0.6);

                return (
                    <div key={country.name} style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "45%",
                        position: "relative"
                    }}>
                        {/* Valor Flotante (Contador) */}
                        <div style={{
                            fontSize: 50,
                            fontWeight: 900,
                            marginBottom: 20,
                            fontVariantNumeric: "tabular-nums", // Evita que los números bailen
                            textShadow: `0 0 15px ${country.color}`
                        }}>
                            {formatNumber(currentVal)}
                        </div>

                        {/* Barra */}
                        <div style={{
                            width: "100%",
                            height: barHeight,
                            background: `linear-gradient(to top, ${country.color}44, ${country.color})`,
                            borderRadius: "20px 20px 0 0",
                            boxShadow: `0 0 30px ${country.color}66`, // Glow effect
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "center",
                            paddingTop: 20,
                            border: `2px solid ${country.color}`
                        }}>
                             <div style={{ fontSize: 80 }}>{country.flag}</div>
                        </div>

                        {/* Nombre País */}
                        <div style={{
                            marginTop: 20,
                            fontSize: 32,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 2
                        }}>
                            {country.name}
                        </div>
                    </div>
                );
            })}
        </div>
      </AbsoluteFill>

      {/* Audio simple - Te recomiendo buscar música de tensión que suba de intensidad */}
      {frame > HOOK_DURATION && frame % 15 === 0 && <Audio src="https://assets.mixkit.co/sfx/preview/mixkit-modern-click-box-check-1120.mp3" volume={0.2} />}
    </AbsoluteFill>
  );
};
