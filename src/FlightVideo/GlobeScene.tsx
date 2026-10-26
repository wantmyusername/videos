import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, useTexture } from "@react-three/drei";
import { staticFile } from "remotion";
import * as THREE from "three";
import { buildRoute, greatCirclePoint, latLngToVector3 } from "./geo";
import type { FlightProps } from "./schema";

const EARTH_RADIUS = 2;
const CRUISE_ALTITUDE = 0.06;

const makeRandom = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const starGeo = (() => {
  const random = makeRandom(20261025);
  const positions = new Float32Array(900 * 3);

  for (let i = 0; i < 900; i++) {
    const radius = 40 + random() * 25;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
})();

const AimCamera: React.FC<{ target: THREE.Vector3 }> = ({ target }) => {
  const { camera } = useThree();

  useLayoutEffect(() => {
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }, [camera, target]);

  return null;
};

const RouteTube: React.FC<{
  points: THREE.Vector3[];
  radius: number;
  color: string;
  opacity: number;
  additive?: boolean;
}> = ({ points, radius, color, opacity, additive }) => {
  const geometry = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    return new THREE.TubeGeometry(
      curve,
      Math.max(16, points.length * 2),
      radius,
      8,
      false,
    );
  }, [points, radius]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
};

export const GlobeScene: React.FC<{
  flight: FlightProps;
  progress: number;
}> = ({ flight, progress }) => {
  const isNight = flight.mapStyle === "night";

  const earthTexture = useTexture(
    staticFile(
      isNight ? "earth/earth_night.png" : "earth/earth_day.jpg",
    ),
  );
  const planeTexture = useTexture(staticFile("flightradar.png"));

  useLayoutEffect(() => {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 8;
    earthTexture.needsUpdate = true;

    planeTexture.colorSpace = THREE.SRGBColorSpace;
    planeTexture.anisotropy = 8;
    planeTexture.needsUpdate = true;
  }, [earthTexture, planeTexture]);

  const start = useMemo(
    () =>
      latLngToVector3(
        flight.origin.lat,
        flight.origin.lng,
        EARTH_RADIUS,
      ),
    [flight.origin.lat, flight.origin.lng],
  );

  const end = useMemo(
    () =>
      latLngToVector3(
        flight.destination.lat,
        flight.destination.lng,
        EARTH_RADIUS,
      ),
    [flight.destination.lat, flight.destination.lng],
  );

  const fullRoute = useMemo(
    () => buildRoute(start, end, EARTH_RADIUS, CRUISE_ALTITUDE),
    [start, end],
  );

  const planePosition = useMemo(
    () =>
      greatCirclePoint(
        start,
        end,
        THREE.MathUtils.clamp(progress, 0, 1),
        EARTH_RADIUS,
        CRUISE_ALTITUDE,
      ),
    [start, end, progress],
  );

  const direction = useMemo(() => {
    const behind = greatCirclePoint(
      start,
      end,
      Math.max(0, progress - 0.003),
      EARTH_RADIUS,
      CRUISE_ALTITUDE,
    );
    const ahead = greatCirclePoint(
      start,
      end,
      Math.min(1, progress + 0.003),
      EARTH_RADIUS,
      CRUISE_ALTITUDE,
    );

    return ahead.sub(behind).normalize();
  }, [start, end, progress]);

  const iconQuaternion = useMemo(() => {
    const normal = planePosition.clone().normalize();
    const heading = direction
      .clone()
      .sub(normal.clone().multiplyScalar(direction.dot(normal)))
      .normalize();
    const right = new THREE.Vector3().crossVectors(heading, normal).normalize();
    const matrix = new THREE.Matrix4().makeBasis(right, heading, normal);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);

    return [
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w,
    ] as [number, number, number, number];
  }, [planePosition, direction]);

  const iconPosition = useMemo(
    () =>
      planePosition
        .clone()
        .add(planePosition.clone().normalize().multiplyScalar(0.02)),
    [planePosition],
  );

  const traveledRoute = useMemo(() => {
    if (progress <= 0.001) {
      return [];
    }

    const lastIndex = Math.floor((fullRoute.length - 1) * progress);
    const points = fullRoute.slice(0, lastIndex + 1);
    points.push(planePosition);

    return points;
  }, [fullRoute, planePosition, progress]);

  const camera = useMemo(() => {
    const normal = planePosition.clone().normalize();
    const side = new THREE.Vector3().crossVectors(normal, direction);

    if (side.lengthSq() < 1e-6) {
      side.set(1, 0, 0);
    }

    side.normalize();

    return normal
      .clone()
      .multiplyScalar(6.6)
      .add(side.multiplyScalar(1.6))
      .add(new THREE.Vector3(0, 0.9, 0));
  }, [planePosition, direction]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={40}
        near={0.1}
        far={200}
        position={[camera.x, camera.y, camera.z]}
      />
      <AimCamera target={planePosition} />

      <ambientLight intensity={isNight ? 0.45 : 0.65} />
      <directionalLight position={[8, 5, 6]} intensity={1.6} />
      <directionalLight
        position={[-8, -3, -6]}
        intensity={isNight ? 0.9 : 0.7}
      />

      <points geometry={starGeo}>
        <pointsMaterial
          size={0.09}
          color="#bfdbfe"
          transparent
          opacity={isNight ? 1 : 0.7}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        {isNight ? (
          <meshBasicMaterial map={earthTexture} />
        ) : (
          <meshStandardMaterial
            map={earthTexture}
            roughness={0.85}
            metalness={0.05}
          />
        )}
      </mesh>

      <mesh scale={1.025}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color={isNight ? "#60a5fa" : "#38bdf8"}
          transparent
          opacity={isNight ? 0.18 : 0.14}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.08}>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color={isNight ? "#1d4ed8" : "#0ea5e9"}
          transparent
          opacity={isNight ? 0.09 : 0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <RouteTube
        points={fullRoute}
        radius={0.003}
        color={isNight ? "#7dd3fc" : "#38bdf8"}
        opacity={isNight ? 0.26 : 0.18}
      />

      {traveledRoute.length > 1 && (
        <>
          <RouteTube
            points={traveledRoute}
            radius={0.028}
            color="#38bdf8"
            opacity={isNight ? 0.24 : 0.2}
            additive
          />
          <RouteTube
            points={traveledRoute}
            radius={0.009}
            color="#e0f2fe"
            opacity={0.95}
          />
        </>
      )}

      <group position={iconPosition} quaternion={iconQuaternion}>
        <mesh>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial
            map={planeTexture}
            transparent
            alphaTest={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  );
};
