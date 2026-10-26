import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { haversineKm } from "./geo";
import type { FlightProps } from "./schema";
import countriesJson from "./data/world-countries.json";
import mexicoStatesJson from "./data/mexico-states.json";
import mexicoLakesJson from "./data/mexico-lakes.json";
import mexicoRiversJson from "./data/mexico-rivers.json";

type Position = number[];
type Geometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };
type LineGeometry =
  | { type: "LineString"; coordinates: Position[] }
  | { type: "MultiLineString"; coordinates: Position[][] };
type AnyGeometry = Geometry | LineGeometry;

type Feature = {
  properties: Record<string, unknown>;
  geometry: Geometry;
};

type LineFeature = {
  properties: Record<string, unknown>;
  geometry: LineGeometry;
};

type FeatureCollection = { features: Feature[] };
type LineFeatureCollection = { features: LineFeature[] };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type Point = { x: number; y: number };

const MERCATOR_LAT_LIMIT = 85.05112878;
export const OUTRO_SECONDS = 1.8;
const REGIONAL_THRESHOLD_KM = 2500;
const ROUTE_SAMPLES = 161;
const TRAIL_SEGMENTS = 96;
const PLANE_SIZE = 64;
const KM_PER_LAT_DEGREE = 111.32;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

const mercator = (lng: number, lat: number): Point => {
  const clampedLat = clamp(lat, -MERCATOR_LAT_LIMIT, MERCATOR_LAT_LIMIT);
  const sin = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
};

const project = (
  point: Point,
  bounds: Bounds,
  width: number,
  height: number,
): [number, number] => [
  ((point.x - bounds.minX) / (bounds.maxX - bounds.minX)) * width,
  ((point.y - bounds.minY) / (bounds.maxY - bounds.minY)) * height,
];

const projectLatLng = (
  lat: number,
  lng: number,
  bounds: Bounds,
  width: number,
  height: number,
) => project(mercator(lng, lat), bounds, width, height);

const forEachPosition = (
  geometry: AnyGeometry,
  callback: (position: Position) => void,
) => {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => ring.forEach(callback));
    return;
  }

  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) =>
      polygon.forEach((ring) => ring.forEach(callback)),
    );
    return;
  }

  if (geometry.type === "LineString") {
    geometry.coordinates.forEach(callback);
    return;
  }

  geometry.coordinates.forEach((line) => line.forEach(callback));
};

const geometryBounds = (geometry: AnyGeometry): Bounds => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  forEachPosition(geometry, (position) => {
    const point = mercator(position[0], position[1]);
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return { minX, maxX, minY, maxY };
};

const prepare = (collection: FeatureCollection) =>
  collection.features
    .filter(
      (feature) =>
        feature.geometry &&
        (feature.geometry.type === "Polygon" ||
          feature.geometry.type === "MultiPolygon"),
    )
    .map((feature) => ({
      ...feature,
      bounds: geometryBounds(feature.geometry),
    }));

const prepareLines = (collection: LineFeatureCollection) =>
  collection.features
    .filter(
      (feature) =>
        feature.geometry &&
        (feature.geometry.type === "LineString" ||
          feature.geometry.type === "MultiLineString"),
    )
    .map((feature) => ({
      ...feature,
      bounds: geometryBounds(feature.geometry),
    }));

const WORLD_COUNTRIES = prepare(
  countriesJson as unknown as FeatureCollection,
);
const MEXICO_STATES = prepare(
  mexicoStatesJson as unknown as FeatureCollection,
);
const MEXICO_LAKES = prepare(mexicoLakesJson as unknown as FeatureCollection);
const MEXICO_RIVERS = prepareLines(
  mexicoRiversJson as unknown as LineFeatureCollection,
);

const intersects = (a: Bounds, b: Bounds) =>
  a.minX <= b.maxX &&
  a.maxX >= b.minX &&
  a.minY <= b.maxY &&
  a.maxY >= b.minY;

const ringPath = (
  ring: Position[],
  bounds: Bounds,
  width: number,
  height: number,
): string => {
  let path = "";

  ring.forEach((position, index) => {
    const [x, y] = project(
      mercator(position[0], position[1]),
      bounds,
      width,
      height,
    );
    path += `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return `${path}Z`;
};

const geometryPath = (
  geometry: Geometry,
  bounds: Bounds,
  width: number,
  height: number,
): string => {
  if (geometry.type === "Polygon") {
    return geometry.coordinates
      .map((ring) => ringPath(ring, bounds, width, height))
      .join(" ");
  }

  return geometry.coordinates
    .map((polygon) =>
      polygon
        .map((ring) => ringPath(ring, bounds, width, height))
        .join(" "),
    )
    .join(" ");
};

const linePath = (
  geometry: LineGeometry,
  bounds: Bounds,
  width: number,
  height: number,
): string => {
  const pathForLine = (line: Position[]) =>
    line
      .map((position, index) => {
        const [x, y] = project(
          mercator(position[0], position[1]),
          bounds,
          width,
          height,
        );

        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  if (geometry.type === "LineString") {
    return pathForLine(geometry.coordinates);
  }

  return geometry.coordinates.map(pathForLine).join(" ");
};

const pointsToPath = (points: [number, number][]) =>
  points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(" ");

const paletteFor = (isNight: boolean) =>
  isNight
    ? {
        backgroundTop: "#071522",
        backgroundBottom: "#02070d",
        halo: "#0ea5e9",
        land: "#0f2b42",
        landBorder: "#315b78",
        state: "#153b55",
        stateBorder: "#3a779b",
        water: "#082f47",
        waterBorder: "#1e5f80",
        waterLabel: "#7dd3fc",
        river: "#2f7898",
        stateText: "#8fb0c7",
        route: "#e90064",
        routeSoft: "rgba(233, 0, 100, 0.3)",
        cityText: "#dbe7f3",
        cityHalo: "#020617",
        labelText: "#f8fafc",
        labelHalo: "#020617",
      }
    : {
        backgroundTop: "#eef3f7",
        backgroundBottom: "#e2e8ef",
        halo: "#7dd3fc",
        land: "#fbfdff",
        landBorder: "#c3cedb",
        state: "#f1f5f9",
        stateBorder: "#d2dde7",
        water: "#cfe6f2",
        waterBorder: "#a7c9db",
        waterLabel: "#2d6f8f",
        river: "#8abed6",
        stateText: "#64748b",
        route: "#e90064",
        routeSoft: "rgba(233, 0, 100, 0.22)",
        cityText: "#475569",
        cityHalo: "#ffffff",
        labelText: "#0f172a",
        labelHalo: "#ffffff",
      };

type CityLabel = {
  name: string;
  lat: number;
  lng: number;
  tier: 1 | 2;
};

const CITY_LABELS: CityLabel[] = [
  { name: "Tepic", lat: 21.5042, lng: -104.8946, tier: 1 },
  { name: "Colima", lat: 19.2452, lng: -103.7248, tier: 1 },
  { name: "Manzanillo", lat: 19.1138, lng: -104.3388, tier: 1 },
  { name: "León", lat: 21.125, lng: -101.686, tier: 1 },
  { name: "Aguascalientes", lat: 21.8853, lng: -102.2916, tier: 1 },
  { name: "Zacatecas", lat: 22.7709, lng: -102.5832, tier: 1 },
  { name: "Morelia", lat: 19.706, lng: -101.195, tier: 1 },
  { name: "Irapuato", lat: 20.6767, lng: -101.3543, tier: 1 },
  { name: "Uruapan", lat: 19.42, lng: -102.06, tier: 1 },
  { name: "Ciudad de México", lat: 19.4326, lng: -99.1332, tier: 1 },
  { name: "Bucerías", lat: 20.75, lng: -105.33, tier: 2 },
  { name: "Compostela", lat: 21.238, lng: -104.9, tier: 2 },
  { name: "Tequila", lat: 20.882, lng: -103.835, tier: 2 },
  { name: "Ameca", lat: 20.55, lng: -104.05, tier: 2 },
  { name: "Autlán", lat: 19.771, lng: -104.365, tier: 2 },
  { name: "Sayula", lat: 19.884, lng: -103.6, tier: 2 },
  { name: "Ciudad Guzmán", lat: 19.704, lng: -103.462, tier: 2 },
  { name: "Ocotlán", lat: 20.355, lng: -102.774, tier: 2 },
  { name: "Tepatitlán", lat: 20.817, lng: -102.733, tier: 2 },
];

const LAKE_LABELS = [
  { name: "Lago de Chapala", lat: 20.23, lng: -103.05 },
];

const labelFor = (place: FlightProps["origin"]) =>
  place.iata ? `${place.city} · ${place.iata}` : place.city;

const blendBounds = (
  from: Bounds,
  to: Bounds,
  amount: number,
  aspect: number,
): Bounds => {
  const fromCenterX = (from.minX + from.maxX) / 2;
  const fromCenterY = (from.minY + from.maxY) / 2;
  const toCenterX = (to.minX + to.maxX) / 2;
  const toCenterY = (to.minY + to.maxY) / 2;
  const fromSpanX = from.maxX - from.minX;
  const toSpanX = to.maxX - to.minX;
  const spanX = Math.exp(
    lerp(Math.log(fromSpanX), Math.log(toSpanX), amount),
  );
  const spanY = spanX / aspect;
  let centerY = lerp(fromCenterY, toCenterY, amount);

  if (spanY < 1) {
    centerY = clamp(centerY, spanY / 2, 1 - spanY / 2);
  }

  return {
    minX: lerp(fromCenterX, toCenterX, amount) - spanX / 2,
    maxX: lerp(fromCenterX, toCenterX, amount) + spanX / 2,
    minY: centerY - spanY / 2,
    maxY: centerY + spanY / 2,
  };
};

export const RegionalMapScene: React.FC<{
  flight: FlightProps;
  progress: number;
  taxiIn: number;
  outroStartFrame: number;
}> = ({ flight, progress, taxiIn, outroStartFrame }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const isNight = flight.mapStyle === "night";
  const palette = paletteFor(isNight);
  const aspect = width / height;

  const distanceKm =
    flight.distance_km ?? haversineKm(flight.origin, flight.destination);
  const midLat = (flight.origin.lat + flight.destination.lat) / 2;
  const contextKm = clamp(distanceKm * 0.45, 32, 190);
  const contextUnit =
    contextKm / (KM_PER_LAT_DEGREE * Math.cos((midLat * Math.PI) / 180)) / 360;

  const origin = useMemo(
    () => mercator(flight.origin.lng, flight.origin.lat),
    [flight.origin.lat, flight.origin.lng],
  );
  const destination = useMemo(
    () => mercator(flight.destination.lng, flight.destination.lat),
    [flight.destination.lat, flight.destination.lng],
  );

  const route = useMemo(() => {
    const mid = {
      x: (origin.x + destination.x) / 2,
      y: (origin.y + destination.y) / 2,
    };
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const length = Math.hypot(dx, dy);
    const safeLength = length || 1;
    const bend = length * 0.08;
    const control = {
      x: mid.x + (-dy / safeLength) * bend,
      y: mid.y + (dx / safeLength) * bend,
    };
    const pointAt = (value: number): Point => {
      const t = clamp(value, 0, 1);
      const inverse = 1 - t;

      return {
        x:
          inverse * inverse * origin.x +
          2 * inverse * t * control.x +
          t * t * destination.x,
        y:
          inverse * inverse * origin.y +
          2 * inverse * t * control.y +
          t * t * destination.y,
      };
    };
    const tangentAt = (value: number): Point => {
      const t = clamp(value, 0, 1);

      return {
        x:
          2 * (1 - t) * (control.x - origin.x) +
          2 * t * (destination.x - control.x),
        y:
          2 * (1 - t) * (control.y - origin.y) +
          2 * t * (destination.y - control.y),
      };
    };
    const samples = Array.from({ length: ROUTE_SAMPLES }, (_, index) =>
      pointAt(index / (ROUTE_SAMPLES - 1)),
    );

    return {
      origin,
      destination,
      pointAt,
      tangentAt,
      samples,
    };
  }, [origin, destination]);

  const imageBounds = useMemo(() => {
    if (!flight.mapBbox) {
      return null;
    }

    const [minLng, minLat, maxLng, maxLat] = flight.mapBbox;
    const topLeft = mercator(minLng, maxLat);
    const bottomRight = mercator(maxLng, minLat);

    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: topLeft.y,
      maxY: bottomRight.y,
    };
  }, [flight.mapBbox]);

  const usesImageMap = Boolean(flight.mapImageUrl && imageBounds);

  const baseBounds = useMemo(() => {
    if (imageBounds) {
      return imageBounds;
    }

    const xs = route.samples.map((point) => point.x);
    const ys = route.samples.map((point) => point.y);
    const routeMinX = Math.min(...xs);
    const routeMaxX = Math.max(...xs);
    const routeMinY = Math.min(...ys);
    const routeMaxY = Math.max(...ys);
    const spanX = Math.max(
      routeMaxX - routeMinX + contextUnit * 2,
      0.0005,
    );
    const spanY = spanX / aspect;
    const routeCenterY = (routeMinY + routeMaxY) / 2;
    const centerY =
      spanY < 1
        ? clamp(routeCenterY, spanY / 2, 1 - spanY / 2)
        : routeCenterY;

    return {
      minX: routeMinX - contextUnit,
      maxX: routeMinX - contextUnit + spanX,
      minY: centerY - spanY / 2,
      maxY: centerY + spanY / 2,
    };
  }, [aspect, contextUnit, imageBounds, route.samples]);

  const outroDuration = Math.round(fps * OUTRO_SECONDS);
  const outro = interpolate(
    frame,
    [outroStartFrame, outroStartFrame + outroDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  const introZoom = interpolate(frame, [0, Math.round(fps * 0.8)], [1.18, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const animatedBounds = useMemo(() => {
    const t = clamp(progress, 0, 1);
    const current = route.pointAt(t);
    const tangent = route.tangentAt(t);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const lead = contextUnit * 0.4 * (1 - t);
    const centerX =
      current.x + (tangent.x / tangentLength) * lead;
    const centerY =
      current.y + (tangent.y / tangentLength) * lead;
    const spanX = contextUnit * 2 * introZoom;
    const spanY = spanX / aspect;
    const clampedCenterY =
      spanY < 1 ? clamp(centerY, spanY / 2, 1 - spanY / 2) : centerY;

    return {
      minX: centerX - spanX / 2,
      maxX: centerX + spanX / 2,
      minY: clampedCenterY - spanY / 2,
      maxY: clampedCenterY + spanY / 2,
    };
  }, [aspect, contextUnit, introZoom, progress, route]);

  const bounds =
    outro > 0
      ? blendBounds(animatedBounds, baseBounds, outro, aspect)
      : animatedBounds;

  const baseSpanX = baseBounds.maxX - baseBounds.minX;
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const zoom = baseSpanX / spanX;
  const translateX =
    ((baseBounds.minX - bounds.minX) / spanX) * width;
  const translateY =
    ((baseBounds.minY - bounds.minY) / spanY) * height;

  const countryPaths = useMemo(
    () =>
      WORLD_COUNTRIES.filter((feature) =>
        intersects(feature.bounds, baseBounds),
      ).map((feature, index) => ({
        key: `country-${index}`,
        path: geometryPath(feature.geometry, baseBounds, width, height),
      })),
    [baseBounds, height, width],
  );

  const statePaths = useMemo(
    () =>
      MEXICO_STATES.filter((feature) =>
        intersects(feature.bounds, baseBounds),
      ).map((feature, index) => ({
        key: `state-${index}`,
        path: geometryPath(feature.geometry, baseBounds, width, height),
      })),
    [baseBounds, height, width],
  );

  const lakePaths = useMemo(
    () =>
      MEXICO_LAKES.filter((feature) =>
        intersects(feature.bounds, baseBounds),
      ).map((feature, index) => ({
        key: `lake-${index}`,
        path: geometryPath(feature.geometry, baseBounds, width, height),
      })),
    [baseBounds, height, width],
  );

  const riverPaths = useMemo(
    () =>
      MEXICO_RIVERS.filter((feature) =>
        intersects(feature.bounds, baseBounds),
      ).map((feature, index) => ({
        key: `river-${index}`,
        path: linePath(feature.geometry, baseBounds, width, height),
      })),
    [baseBounds, height, width],
  );

  const fullRoute = useMemo(
    () =>
      route.samples.map((point) =>
        project(point, bounds, width, height),
      ),
    [bounds, height, route.samples, width],
  );

  const routeProgress = clamp(progress, 0, 1);
  const trailPoints = Array.from(
    { length: TRAIL_SEGMENTS + 1 },
    (_, index) =>
      project(
        route.pointAt((routeProgress * index) / TRAIL_SEGMENTS),
        bounds,
        width,
        height,
      ),
  );
  const trailOpacity =
    (taxiIn < 1 ? 0 : 1) * (routeProgress > 0.0001 ? 1 : 0);
  const trailPath = pointsToPath(trailPoints);
  const trailSegments = trailPoints.slice(0, -1).map((point, index) => {
    const next = trailPoints[index + 1];
    const t = index / Math.max(1, trailPoints.length - 2);

    return {
      key: `trail-${index}`,
      d: pointsToPath([point, next]),
      width: lerp(6, 12, Math.pow(t, 0.6)),
      opacity: lerp(0.5, 1, Math.pow(t, 0.6)) * trailOpacity,
      color: `rgb(${Math.round(lerp(139, 34, t))},${Math.round(
        lerp(92, 211, t),
      )},${Math.round(lerp(246, 238, t))})`,
    };
  });
  const fullPath = pointsToPath(fullRoute);

  const [originX, originY] = project(origin, bounds, width, height);
  const [destinationX, destinationY] = project(
    destination,
    bounds,
    width,
    height,
  );

  const routePlaneAngle = (value: number) => {
    const tangent = route.tangentAt(value);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;

    return (
      (Math.atan2(tangent.x / tangentLength, -tangent.y / tangentLength) *
        180) /
      Math.PI
    );
  };

  const planePoint = route.pointAt(routeProgress);
  const [planeX, planeY] = project(
    planePoint,
    bounds,
    width,
    height,
  );
  const planeAngle = routePlaneAngle(routeProgress);

  const cityOpacity = clamp((zoom - 1.15) / 1.4, 0, 0.72);
  const stateLabelOpacity = clamp((zoom - 1.45) / 1.2, 0, 0.3);
  const waterLabelOpacity = clamp((zoom - 1.7) / 1.2, 0, 0.5);
  const isOnScreen = (x: number, y: number, margin = 140) =>
    x > -margin && x < width + margin && y > -margin && y < height + margin;
  const labelAnchor = (x: number) =>
    x < width * 0.22 ? "start" : x > width * 0.78 ? "end" : "middle";
  const labelOffset = (x: number) =>
    x < width * 0.22 ? 18 : x > width * 0.78 ? -18 : 0;

  const stateLabels = MEXICO_STATES.filter((state) =>
    intersects(state.bounds, baseBounds),
  ).flatMap((state) => {
    const lat = Number(state.properties.latitude);
    const lng = Number(state.properties.longitude);
    const name = String(
      state.properties.name_es ?? state.properties.name ?? "",
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) {
      return [];
    }

    const [x, y] = projectLatLng(lat, lng, bounds, width, height);

    if (!isOnScreen(x, y, 80)) {
      return [];
    }

    return [
      {
        key: String(state.properties.adm1_code ?? name),
        name: name.toUpperCase(),
        x,
        y,
      },
    ];
  });

  const lakeLabels = LAKE_LABELS.flatMap((lake) => {
    const [x, y] = projectLatLng(lake.lat, lake.lng, bounds, width, height);

    return isOnScreen(x, y, 60) ? [{ ...lake, x, y }] : [];
  });

  const projectedCities = CITY_LABELS.flatMap((city) => {
    const [x, y] = projectLatLng(city.lat, city.lng, bounds, width, height);

    if (
      !isOnScreen(x, y, 60) ||
      (Math.abs(city.lat - flight.origin.lat) < 0.18 &&
        Math.abs(city.lng - flight.origin.lng) < 0.18) ||
      (Math.abs(city.lat - flight.destination.lat) < 0.18 &&
        Math.abs(city.lng - flight.destination.lng) < 0.18)
    ) {
      return [];
    }

    return [
      {
        ...city,
        x,
        y,
        estimatedWidth: city.name.length * (city.tier === 1 ? 11 : 10),
      },
    ];
  });

  const cityLabels: typeof projectedCities = [];

  for (const city of projectedCities) {
    const overlaps = cityLabels.some(
      (placed) =>
        Math.abs(placed.x - city.x) <
          (placed.estimatedWidth + city.estimatedWidth) / 2 + 12 &&
        Math.abs(placed.y - city.y) < 28,
    );

    if (!overlaps) {
      cityLabels.push(city);
    }
  }

  return (
    <AbsoluteFill>
      {usesImageMap ? (
        <Img
          src={flight.mapImageUrl as string}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height,
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`,
            transformOrigin: "0 0",
            display: "block",
            filter: "brightness(1.16) contrast(1.03) saturate(1.08)",
          }}
        />
      ) : null}

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, display: "block" }}
      >
      <defs>
        {!usesImageMap ? (
          <>
            <linearGradient id="regional-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.backgroundTop} />
              <stop offset="100%" stopColor={palette.backgroundBottom} />
            </linearGradient>
            <radialGradient id="regional-halo" cx="50%" cy="44%" r="76%">
              <stop offset="0%" stopColor={palette.halo} stopOpacity={0.14} />
              <stop offset="100%" stopColor={palette.halo} stopOpacity={0} />
            </radialGradient>
          </>
        ) : null}
        <radialGradient id="plane-glow">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.34} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
        </radialGradient>
      </defs>

      {!usesImageMap ? (
        <>
          <rect width={width} height={height} fill="url(#regional-bg)" />
          <rect width={width} height={height} fill="url(#regional-halo)" />

          <g transform={`translate(${translateX} ${translateY}) scale(${zoom})`}>
            {countryPaths.map((country) => (
              <path
                key={country.key}
                d={country.path}
                fill={palette.land}
                stroke={palette.landBorder}
                strokeWidth={1.8 / zoom}
                strokeLinejoin="round"
                fillRule="evenodd"
              />
            ))}

            {statePaths.map((state) => (
              <path
                key={state.key}
                d={state.path}
                fill={palette.state}
                stroke={palette.stateBorder}
                strokeWidth={1.5 / zoom}
                strokeLinejoin="round"
                fillRule="evenodd"
              />
            ))}

            {lakePaths.map((lake) => (
              <path
                key={lake.key}
                d={lake.path}
                fill={palette.water}
                stroke={palette.waterBorder}
                strokeWidth={1.2 / zoom}
                strokeLinejoin="round"
                fillRule="evenodd"
              />
            ))}

            {riverPaths.map((river) => (
              <path
                key={river.key}
                d={river.path}
                fill="none"
                stroke={palette.river}
                strokeWidth={1.4 / zoom}
                strokeOpacity={0.65}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        </>
      ) : null}

      {!usesImageMap && stateLabelOpacity > 0.01
        ? stateLabels.map((state) => (
            <text
              key={state.key}
              x={state.x}
              y={state.y}
              fill={palette.stateText}
              opacity={stateLabelOpacity}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              letterSpacing={5}
            >
              {state.name}
            </text>
          ))
        : null}

      {!usesImageMap && waterLabelOpacity > 0.01
        ? lakeLabels.map((lake) => (
            <text
              key={lake.name}
              x={lake.x}
              y={lake.y}
              fill={palette.waterLabel}
              opacity={waterLabelOpacity}
              textAnchor="middle"
              fontSize={16}
              fontStyle="italic"
              fontWeight={600}
            >
              {lake.name}
            </text>
          ))
        : null}

      {!usesImageMap && cityOpacity > 0.01
          ? cityLabels.map((city) => {
            const isMajor = city.tier === 1;
            const labelOpacity = cityOpacity * (isMajor ? 1 : 0.65);
            const anchor =
              city.x + city.estimatedWidth > width - 24 ? "end" : "start";
            const offset = anchor === "end" ? -7 : 7;

            return (
              <g key={city.name} opacity={labelOpacity}>
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isMajor ? 2.6 : 2}
                  fill={palette.cityText}
                />
                <text
                  x={city.x + offset}
                  y={city.y + (isMajor ? 5 : 4)}
                  textAnchor={anchor}
                  fill={palette.cityText}
                  stroke={palette.cityHalo}
                  strokeWidth={isMajor ? 4 : 3}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  fontSize={isMajor ? 22 : 17}
                  fontWeight={600}
                >
                  {city.name}
                </text>
              </g>
            );
          })
        : null}

      <path
        d={fullPath}
        fill="none"
        stroke={palette.routeSoft}
        strokeWidth={3}
        strokeDasharray="7 11"
        strokeLinecap="round"
      />

      {trailOpacity > 0.01 ? (
        <path
          d={trailPath}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={24}
          strokeOpacity={0.14 * trailOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {trailSegments.map((segment) => (
        <path
          key={segment.key}
          d={segment.d}
          fill="none"
          stroke={segment.color}
          strokeWidth={segment.width}
          strokeOpacity={segment.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {isOnScreen(originX, originY) ? (
        <g transform={`translate(${originX} ${originY})`}>
          <circle r={26} fill={palette.route} opacity={0.08} />
          <circle
            r={18}
            fill="none"
            stroke={palette.route}
            strokeOpacity={0.45}
            strokeWidth={2}
          />
          <circle r={6.5} fill="#f8fafc" stroke={palette.route} strokeWidth={4} />
          <text
            x={labelOffset(originX)}
            y={-38}
            textAnchor={labelAnchor(originX)}
            fill={palette.labelText}
            stroke={palette.labelHalo}
            strokeWidth={6}
            paintOrder="stroke"
            strokeLinejoin="round"
            fontSize={30}
            fontWeight={800}
          >
            {labelFor(flight.origin)}
          </text>
        </g>
      ) : null}

      {isOnScreen(destinationX, destinationY) ? (
        <g transform={`translate(${destinationX} ${destinationY})`}>
          <circle r={26} fill={palette.route} opacity={0.08} />
          <circle
            r={18}
            fill="none"
            stroke={palette.route}
            strokeOpacity={0.45}
            strokeWidth={2}
          />
          <circle r={6.5} fill="#f8fafc" stroke={palette.route} strokeWidth={4} />
          <text
            x={labelOffset(destinationX)}
            y={64}
            textAnchor={labelAnchor(destinationX)}
            fill={palette.labelText}
            stroke={palette.labelHalo}
            strokeWidth={6}
            paintOrder="stroke"
            strokeLinejoin="round"
            fontSize={30}
            fontWeight={800}
          >
            {labelFor(flight.destination)}
          </text>
        </g>
      ) : null}

      {isOnScreen(planeX, planeY) ? (
        <g transform={`translate(${planeX} ${planeY})`}>
          <circle r={44} fill="url(#plane-glow)" />
          <circle
            r={28}
            fill="none"
            stroke="#22d3ee"
            strokeOpacity={0.4}
            strokeWidth={2}
          />
          <g transform={`rotate(${planeAngle})`}>
            <image
              href={staticFile("flightradar.png")}
              x={-PLANE_SIZE / 2}
              y={-PLANE_SIZE / 2}
              width={PLANE_SIZE}
              height={PLANE_SIZE}
            />
          </g>
        </g>
      ) : null}
      </svg>
    </AbsoluteFill>
  );
};

export const isRegionalRoute = (
  flight: FlightProps,
  distanceKm: number,
): boolean => {
  if (flight.mapMode === "regional") {
    return true;
  }

  if (flight.mapMode === "globe") {
    return false;
  }

  return distanceKm < REGIONAL_THRESHOLD_KM;
};
