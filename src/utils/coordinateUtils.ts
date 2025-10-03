/**
 * Coordinate Conversion Utilities
 * Converts Geographic Coordinates (Lat/Long) to Plane Coordinates (East/North)
 * Using MAGNA-SIRGAS projection system (Colombia)
 */

export interface MagnaSirgasOrigin {
  name: string;
  code: string;
  centralMeridian: number; // Longitude in decimal degrees
  latitudeOrigin: number; // Latitude in decimal degrees
  falseEasting: number; // meters
  falseNorthing: number; // meters
  scaleFactor: number;
}

// MAGNA-SIRGAS Origins for Colombia
export const MAGNA_SIRGAS_ORIGINS: MagnaSirgasOrigin[] = [
  {
    name: 'Origen Bogotá',
    code: 'BOGOTA',
    centralMeridian: -74.08091667, // 74° 04' 51.3" W
    latitudeOrigin: 4.59904722, // 4° 35' 56.57" N
    falseEasting: 1000000,
    falseNorthing: 1000000,
    scaleFactor: 1.0,
  },
  {
    name: 'Origen Este-Este',
    code: 'ESTE_ESTE',
    centralMeridian: -71.08091667, // 71° 04' 51.3" W
    latitudeOrigin: 4.59904722, // 4° 35' 56.57" N
    falseEasting: 5000000,
    falseNorthing: 2000000,
    scaleFactor: 1.0,
  },
  {
    name: 'Origen Este',
    code: 'ESTE',
    centralMeridian: -73.08091667, // 73° 04' 51.3" W
    latitudeOrigin: 4.59904722, // 4° 35' 56.57" N
    falseEasting: 5000000,
    falseNorthing: 2000000,
    scaleFactor: 1.0,
  },
  {
    name: 'Origen Oeste',
    code: 'OESTE',
    centralMeridian: -77.08091667, // 77° 04' 51.3" W
    latitudeOrigin: 4.59904722, // 4° 35' 56.57" N
    falseEasting: 1000000,
    falseNorthing: 1000000,
    scaleFactor: 1.0,
  },
  {
    name: 'Origen Oeste-Oeste',
    code: 'OESTE_OESTE',
    centralMeridian: -75.08091667, // 75° 04' 51.3" W
    latitudeOrigin: 4.59904722, // 4° 35' 56.57" N
    falseEasting: 1000000,
    falseNorthing: 1000000,
    scaleFactor: 1.0,
  },
  {
    name: 'Origen Arauca',
    code: 'ARAUCA',
    centralMeridian: -70.5, // 70° 30' W
    latitudeOrigin: 7.0, // 7° N
    falseEasting: 1000000,
    falseNorthing: 1000000,
    scaleFactor: 1.0,
  },
];

// GRS80 Ellipsoid parameters (used by MAGNA-SIRGAS)
const GRS80 = {
  a: 6378137.0, // Semi-major axis (meters)
  f: 1 / 298.257222101, // Flattening
  get b() {
    return this.a * (1 - this.f); // Semi-minor axis
  },
  get e2() {
    return 2 * this.f - this.f * this.f; // First eccentricity squared
  },
  get e2Prime() {
    return this.e2 / (1 - this.e2); // Second eccentricity squared
  },
};

/**
 * Converts degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Converts geographic coordinates (lat/long) to plane coordinates (East/North)
 * using Transverse Mercator projection (Gauss-Krüger)
 */
export const geographicToPlane = (
  latitude: number,
  longitude: number,
  origin: MagnaSirgasOrigin
): { east: number; north: number } => {
  // Convert to radians
  const lat = toRadians(latitude);
  const lon = toRadians(longitude);
  const lon0 = toRadians(origin.centralMeridian);
  const lat0 = toRadians(origin.latitudeOrigin);

  // Calculate parameters
  const N = GRS80.a / Math.sqrt(1 - GRS80.e2 * Math.sin(lat) * Math.sin(lat));
  const T = Math.tan(lat) * Math.tan(lat);
  const C = GRS80.e2Prime * Math.cos(lat) * Math.cos(lat);
  const A = (lon - lon0) * Math.cos(lat);

  // Calculate M (meridian arc)
  const e4 = GRS80.e2 * GRS80.e2;
  const e6 = e4 * GRS80.e2;
  const e8 = e6 * GRS80.e2;

  const M =
    GRS80.a *
    ((1 - GRS80.e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * lat -
      ((3 * GRS80.e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) *
        Math.sin(2 * lat) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * lat) -
      ((35 * e6) / 3072) * Math.sin(6 * lat));

  const M0 =
    GRS80.a *
    ((1 - GRS80.e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * lat0 -
      ((3 * GRS80.e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) *
        Math.sin(2 * lat0) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * lat0) -
      ((35 * e6) / 3072) * Math.sin(6 * lat0));

  // Calculate Easting (X) and Northing (Y)
  const east =
    origin.scaleFactor *
      N *
      (A +
        ((1 - T + C) * A * A * A) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * GRS80.e2Prime) *
          A *
          A *
          A *
          A *
          A) /
          120) +
    origin.falseEasting;

  const north =
    origin.scaleFactor *
      (M -
        M0 +
        N *
          Math.tan(lat) *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * GRS80.e2Prime) *
              A *
              A *
              A *
              A *
              A *
              A) /
              720)) +
    origin.falseNorthing;

  return {
    east: Math.round(east * 100) / 100, // Round to 2 decimals
    north: Math.round(north * 100) / 100, // Round to 2 decimals
  };
};

/**
 * Formats plane coordinates for display
 */
export const formatPlaneCoordinates = (east: number, north: number): string => {
  return `Este: ${east.toFixed(2)} m, Norte: ${north.toFixed(2)} m`;
};

/**
 * Parses coordinate input (supports both decimal and DMS format)
 * Returns decimal degrees
 */
export const parseCoordinate = (input: string): number | null => {
  if (!input || input.trim() === '') return null;

  // Try parsing as decimal
  const decimal = parseFloat(input.replace(',', '.'));
  if (!isNaN(decimal)) {
    return decimal;
  }

  // Try parsing DMS format (e.g., "4° 35' 56.57\"")
  const dmsRegex = /(-?\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*/;
  const match = input.match(dmsRegex);

  if (match) {
    const degrees = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat(match[3]);

    const decimalDegrees = Math.abs(degrees) + minutes / 60 + seconds / 3600;
    return degrees < 0 ? -decimalDegrees : decimalDegrees;
  }

  return null;
};
