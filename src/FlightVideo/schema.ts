import { z } from "zod";

export const placeSchema = z.object({
  city: z.string(),
  country: z.string().optional(),
  iata: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const wordSchema = z.object({
  word: z.string().optional(),
  text: z.string().optional(),
  start: z.number(),
  end: z.number(),
});

export const flightSchema = z.object({
  flight_number: z.string(),
  airline: z.string(),
  origin: placeSchema,
  destination: placeSchema,
  distance_km: z.number().optional(),
  flight_time_formatted: z.string().optional(),
  whiteNoiseStartSeconds: z.number().min(0).max(20).optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  title_overlay: z.string(),
  subtitle_overlay: z.string().optional(),
  script: z.string().optional(),
  audioUrl: z.string().optional(),
  bgMusicUrl: z.string().optional(),
  totalFrames: z.number().optional(),
  words: z.array(wordSchema).optional(),
  mapStyle: z.enum(["day", "night"]).default("day"),
  mapMode: z.enum(["auto", "globe", "regional"]).default("auto"),
  mapImageUrl: z.string().optional(),
  mapBbox: z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .optional(),
  mapAttribution: z.string().optional(),
});

export type FlightProps = z.infer<typeof flightSchema>;

export const flightDefaultProps: FlightProps = {
  flight_number: "CX805",
  airline: "Cathay Pacific",
  origin: { city: "Toronto", country: "Canadá", lat: 43.6777, lng: -79.6248 },
  destination: { city: "Hong Kong", country: "China", lat: 22.308, lng: 113.9185 },
  distance_km: 12567,
  flight_time_formatted: "15h 25m",
  title_overlay: "TORONTO - HONG KONG",
  subtitle_overlay: "La ruta de un vuelo sobre el Polo Norte",
  script:
    "¿Te imaginas mirar por la ventana y ver el hielo infinito del Polo Norte? El vuelo CX805 de Cathay Pacific conecta Toronto con Hong Kong.",
  totalFrames: 1560,
  words: [],
  whiteNoiseStartSeconds: 1,
  mapStyle: "day",
  mapMode: "auto",
};
