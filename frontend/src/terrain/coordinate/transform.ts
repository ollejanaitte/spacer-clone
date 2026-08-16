// JGD2011 平面直角座標系（EPSG 6669-6687）の横メルカトル投影（GRS80）
// 移植元: site-context-prototype packages/core/src/coordinate/transform.ts
// 設計参照: site-context-prototype docs/phase2/08章（正本 metric・float64）

export interface Zone {
  epsg: number;
  zone: number;
  lat0: number; // 度
  lon0: number; // 度
}

// 平成14年国土交通省告示第9号 19系の原点（EPSG定義に基づくlat0/lon0）
export const JGD2011_ZONES: Zone[] = [
  { epsg: 6669, zone: 1, lat0: 33.0, lon0: 129.5 },
  { epsg: 6670, zone: 2, lat0: 33.0, lon0: 131.0 },
  { epsg: 6671, zone: 3, lat0: 36.0, lon0: 132 + 10 / 60 },
  { epsg: 6672, zone: 4, lat0: 33.0, lon0: 133.5 },
  { epsg: 6673, zone: 5, lat0: 36.0, lon0: 134 + 20 / 60 },
  { epsg: 6674, zone: 6, lat0: 36.0, lon0: 136.0 },
  { epsg: 6675, zone: 7, lat0: 36.0, lon0: 137 + 10 / 60 },
  { epsg: 6676, zone: 8, lat0: 36.0, lon0: 138.5 },
  { epsg: 6677, zone: 9, lat0: 36.0, lon0: 139 + 50 / 60 },
  { epsg: 6678, zone: 10, lat0: 40.0, lon0: 140 + 50 / 60 },
  { epsg: 6679, zone: 11, lat0: 44.0, lon0: 140 + 15 / 60 },
  { epsg: 6680, zone: 12, lat0: 44.0, lon0: 142 + 15 / 60 },
  { epsg: 6681, zone: 13, lat0: 44.0, lon0: 144 + 15 / 60 },
  { epsg: 6682, zone: 14, lat0: 26.0, lon0: 142.0 },
  { epsg: 6683, zone: 15, lat0: 26.0, lon0: 127.5 },
  { epsg: 6684, zone: 16, lat0: 26.0, lon0: 124.0 },
  { epsg: 6685, zone: 17, lat0: 26.0, lon0: 131.0 },
  { epsg: 6686, zone: 18, lat0: 20.0, lon0: 136.0 },
  { epsg: 6687, zone: 19, lat0: 26.0, lon0: 154.0 },
];

export const ZONE_BY_EPSG: Map<number, Zone> = new Map(JGD2011_ZONES.map((z) => [z.epsg, z]));

// GRS80
const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);
const K0 = 0.9999;

const deg2rad = (d: number) => (d * Math.PI) / 180;

function meridionalArc(lat: number): number {
  // 子午線弧長（Snyder式・e2級）
  const e2 = E2;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const A0 = 1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256;
  const A2 = (3 / 8) * (e2 + e4 / 4 + (15 * e6) / 128);
  const A4 = (15 / 256) * (e4 + (3 * e6) / 4);
  const A6 = (35 * e6) / 3072;
  return A * (A0 * lat - A2 * Math.sin(2 * lat) + A4 * Math.sin(4 * lat) - A6 * Math.sin(6 * lat));
}

/** 経緯度→平面直角座標（EPSG:6669-6687）。出力: {x(easting), y(northing)} in m（原点基準） */
export function latLonToPlane(latDeg: number, lonDeg: number, epsg: number): { x: number; y: number } {
  const z = ZONE_BY_EPSG.get(epsg);
  if (!z) throw new Error(`COORD-UNKNOWN-EPSG: ${epsg}`);
  const lat0 = deg2rad(z.lat0);
  const lon0 = deg2rad(z.lon0);
  const lat = deg2rad(latDeg);
  const lon = deg2rad(lonDeg);
  const dlon = lon - lon0;
  const N = A / Math.sqrt(1 - E2 * Math.sin(lat) * Math.sin(lat));
  const T = Math.tan(lat) * Math.tan(lat);
  const C = EP2 * Math.cos(lat) * Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  // 原点緯度から測った子午線弧長（JGD2011平面直角は原点基準のy）
  const M0 = meridionalArc(lat0);
  const M = meridionalArc(lat) - M0;

  const l2 = dlon * dlon;
  const l3 = dlon * dlon * dlon;
  const l4 = l2 * l2;
  const l5 = l4 * dlon;

  // Snyder式: Adl = Δλ·cosφ（x/y両式で使用）
  const Adl = dlon * cosLat;
  const A2 = Adl * Adl;
  const A4 = A2 * A2;
  const A6 = A4 * A2;

  const x = K0 * N * (dlon * cosLat + ((l3 * cosLat) / 6) * (1 - T + C) + ((l5 * cosLat) / 120) * (5 - 18 * T + T * T + 72 * C - 58 * EP2));
  const y =
    K0 *
    (M +
      N * Math.tan(lat) * ((A2 / 2) * (1 + C) + (A4 / 24) * (5 - T + 9 * C + 4 * C * C) + (A6 / 720) * (61 - 58 * T + T * T + 600 * C - 330 * EP2)));
  return { x, y };
}

/** 平面直角座標→経緯度（Snyder逆変換 + ニュートン収束）。出力: {lat, lon} in 度 */
export function planeToLatLon(x: number, y: number, epsg: number): { lat: number; lon: number } {
  const z = ZONE_BY_EPSG.get(epsg);
  if (!z) throw new Error(`COORD-UNKNOWN-EPSG: ${epsg}`);
  const lat0 = deg2rad(z.lat0);
  const lon0 = deg2rad(z.lon0);

  // 足点緯度φ1（footpoint）をニュートン法で逆算（yは原点基準なので原点弧長を加算）
  const M0 = meridionalArc(lat0);
  const M = y / K0 + M0;
  let phi1 = lat0;
  for (let i = 0; i < 12; i++) {
    const f = meridionalArc(phi1) - M;
    const df = A / Math.sqrt(1 - E2 * Math.sin(phi1) * Math.sin(phi1));
    phi1 -= f / df;
  }

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const N1 = A / Math.sqrt(1 - E2 * sin1 * sin1);
  const T1 = tan1 * tan1;
  const C1 = EP2 * cos1 * cos1;
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * sin1 * sin1, 1.5);
  const D = x / (N1 * K0);

  const D2 = D * D;
  const D4 = D2 * D2;
  const D6 = D4 * D2;

  const lat =
    phi1 -
    ((N1 * tan1) / R1) *
      (D2 / 2 - (D4 / 24) * (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) + (D6 / 720) * (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1));

  const lon =
    lon0 +
    (D - (D * D2) / 6 * (1 + 2 * T1 + C1) + (D6 / 120) * (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1)) / cos1;

  // ニュートン収束（級数打ち切りの残差をサブmmへ）
  let latDeg = (lat * 180) / Math.PI;
  let lonDeg = (lon * 180) / Math.PI;
  for (let i = 0; i < 4; i++) {
    const fwd = latLonToPlane(latDeg, lonDeg, epsg);
    const dX = x - fwd.x;
    const dY = y - fwd.y;
    const cosLat = Math.cos((latDeg * Math.PI) / 180);
    latDeg += dY / 111320;
    lonDeg += dX / (111320 * Math.max(cosLat, 0.01));
    if (Math.abs(dX) < 1e-8 && Math.abs(dY) < 1e-8) break;
  }
  return { lat: latDeg, lon: lonDeg };
}