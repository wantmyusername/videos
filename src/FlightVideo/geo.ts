import * as THREE from "three";

export const latLngToVector3 = (
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};

const angularDistance = (a: THREE.Vector3, b: THREE.Vector3) =>
  Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));

export const greatCirclePoint = (
  origin: THREE.Vector3,
  destination: THREE.Vector3,
  t: number,
  radius: number,
  altitude = 0.06,
): THREE.Vector3 => {
  const a = origin.clone().normalize();
  const b = destination.clone().normalize();
  const omega = angularDistance(a, b);

  if (omega < 1e-5) {
    return a.multiplyScalar(radius);
  }

  const sinOmega = Math.sin(omega);
  const point = a
    .multiplyScalar(Math.sin((1 - t) * omega) / sinOmega)
    .add(b.multiplyScalar(Math.sin(t * omega) / sinOmega));

  const lift = 1 + altitude * Math.sin(Math.PI * t);
  return point.normalize().multiplyScalar(radius * lift);
};

export const haversineKm = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): number => {
  const earthRadiusKm = 6371;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const deltaLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const deltaLng = ((destination.lng - origin.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

export const buildRoute = (
  origin: THREE.Vector3,
  destination: THREE.Vector3,
  radius: number,
  altitude = 0.06,
): THREE.Vector3[] => {
  const a = origin.clone().normalize();
  const b = destination.clone().normalize();
  const omega = angularDistance(a, b);
  const segments = Math.max(32, Math.ceil((omega / Math.PI) * 220));

  return Array.from({ length: segments + 1 }, (_, index) =>
    greatCirclePoint(origin, destination, index / segments, radius, altitude),
  );
};
