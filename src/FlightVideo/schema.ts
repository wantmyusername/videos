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
  flight_number: "IB 6250",
  airline: "Iberia",
  origin: { city: "Madrid", country: "España", lat: 40.4719, lng: -3.5626 },
  destination: { city: "Buenos Aires", country: "Argentina", lat: -34.8222, lng: -58.5358 },
  distance_km: 10050,
  flight_time_formatted: "13h 15m",
  title_overlay: "MADRID - BUENOS AIRES",
  subtitle_overlay: "La ruta que cruza el Atlántico Sur",
  script:
    "El vuelo IB 6250 de Iberia conecta Madrid con Buenos Aires cruzando el Atlántico Sur.",
  totalFrames: 1560,
  words: [],
  whiteNoiseStartSeconds: 1,
  mapStyle: "day",
  mapMode: "auto",
};
