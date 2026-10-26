import React from 'react';
import { Composition, staticFile } from "remotion";
import {
  END_CARD_EXTRA_SECONDS,
  FlightVideo,
} from "./FlightVideo/FlightVideo";
import {
  flightDefaultProps,
  flightSchema,
  type FlightProps,
} from "./FlightVideo/schema";
import "./style.css";

const FLIGHT_FPS = 30;

const VB3005_MAP_BBOX: [number, number, number, number] = [
  -105.77904,
  -2.0903280528027763,
  -80.16996,
  39.78898083951907,
];

const VB3005_PREVIEW_PROPS: FlightProps = {
  flight_number: "VB 3005",
  airline: "Viva Aerobus",
  origin: {
    city: "Cancún",
    country: "México",
    iata: "CUN",
    lat: 21.0365,
    lng: -86.8771,
  },
  destination: {
    city: "Ciudad de México",
    country: "México",
    iata: "MEX",
    lat: 19.4361,
    lng: -99.0719,
  },
  distance_km: 1285,
  flight_time_formatted: "2h 20m",
  departure_time: "07:00",
  arrival_time: "08:20",
  title_overlay: "CANCÚN - CIUDAD DE MÉXICO",
  subtitle_overlay: "¡Viaja en 2h 20m con Viva Aerobus!",
  script:
    "¿Sabías que puedes recorrer 1285 km en solo 2 horas y 20 minutos? ¡Así es! Con el vuelo VB 3005 de Viva Aerobus, la distancia entre Cancún y Ciudad de México se convierte en un suspiro.",
  audioUrl:
    "https://appsengine.us/audios/20261026-083841_VB3005_Viajaen2h20mconVivaAerobus.wav",
  totalFrames: 1140,
  whiteNoiseStartSeconds: 2,
  mapStyle: "night",
  mapMode: "auto",
};

const getFlightDuration = (props: FlightProps) => {
  const lastWordEnd = (props.words ?? []).reduce(
    (max, word) => Math.max(max, word.end),
    0,
  );
  const base =
    props.totalFrames && props.totalFrames > 0
      ? Math.ceil(props.totalFrames)
      : lastWordEnd > 0
        ? Math.ceil(lastWordEnd * FLIGHT_FPS) + 30
        : 1500;

  return base + Math.round(END_CARD_EXTRA_SECONDS * FLIGHT_FPS);
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FlightVideo"
        component={FlightVideo}
        durationInFrames={1500}
        fps={FLIGHT_FPS}
        width={1080}
        height={1920}
        schema={flightSchema}
        defaultProps={flightDefaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: getFlightDuration(props),
          props,
        })}
      />

      <Composition
        id="FlightVideoPreview"
        component={FlightVideo}
        durationInFrames={1140}
        fps={FLIGHT_FPS}
        width={1080}
        height={1920}
        schema={flightSchema}
        defaultProps={{
          ...VB3005_PREVIEW_PROPS,
          mapImageUrl: staticFile("maps/preview-vb3005.png"),
          mapBbox: VB3005_MAP_BBOX,
          mapAttribution: "© Mapbox © OpenStreetMap contributors",
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: getFlightDuration(props),
          props,
        })}
      />
    </>
  );
};
