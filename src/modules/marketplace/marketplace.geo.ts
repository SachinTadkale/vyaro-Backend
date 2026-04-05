import { Prisma } from "@prisma/client";
import { EARTH_RADIUS_KM } from "./marketplace.constants";

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const clampLongitude = (value: number) => {
  if (value < -180) {
    return -180;
  }

  if (value > 180) {
    return 180;
  }

  return value;
};

export const getBoundingBox = (
  latitude: number,
  longitude: number,
  radiusKm: number,
): BoundingBox => {
  const latDelta = radiusKm / 110.574;
  const cosLatitude = Math.cos(toRadians(latitude));
  const lngDelta =
    Math.abs(cosLatitude) < 0.00001
      ? 180
      : radiusKm / (111.32 * Math.abs(cosLatitude));

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLng: clampLongitude(longitude - lngDelta),
    maxLng: clampLongitude(longitude + lngDelta),
  };
};

export const calculateHaversineDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) => {
  const latDistance = toRadians(toLat - fromLat);
  const lngDistance = toRadians(toLng - fromLng);
  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(lngDistance / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
};

export const haversineDistanceSql = (latitude: number, longitude: number) =>
  Prisma.sql`
    (
      ${EARTH_RADIUS_KM} * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS("ml"."latitude" - ${latitude}) / 2), 2) +
          COS(RADIANS(${latitude})) *
          COS(RADIANS("ml"."latitude")) *
          POWER(SIN(RADIANS("ml"."longitude" - ${longitude}) / 2), 2)
        )
      )
    )
  `;
