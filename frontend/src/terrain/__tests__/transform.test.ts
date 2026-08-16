import { describe, expect, it } from "vitest";
import { latLonToPlane, planeToLatLon, ZONE_BY_EPSG } from "../coordinate/transform";

describe("T-COORD-01 plane rectangular round-trip (EPSG 6669-6687)", () => {
  for (const epsg of [6669, 6674, 6677, 6682, 6687]) {
    it(`round-trip zone epsg=${epsg} within 1e-3 m`, () => {
      const z = ZONE_BY_EPSG.get(epsg)!;
      const lat = z.lat0 + 0.5;
      const lon = z.lon0 + 0.5;
      const p = latLonToPlane(lat, lon, epsg);
      const back = planeToLatLon(p.x, p.y, epsg);
      const dLat = (back.lat - lat) * 111320;
      const dLon = (back.lon - lon) * 111320 * Math.cos((lat * Math.PI) / 180);
      expect(Math.hypot(dLat, dLon)).toBeLessThan(1e-3);
    });
  }

  it("forward produces plausible scale (zone 9 near Tokyo)", () => {
    // 東京駅付近 lon=139.767, lat=35.681 → zone 9 (EPSG 6677)。
    // JGD2011平面直角は原点基準。zone9原点(36°N,139°50'E)から南約35km → yは負
    const p = latLonToPlane(35.681, 139.767, 6677);
    expect(Math.abs(p.x)).toBeLessThan(100000);
    expect(p.y).toBeLessThan(0);
    expect(p.y).toBeGreaterThan(-60000);
  });

  it("Gujo Hachiman (EPSG:6674) matches pyproj reference", () => {
    // 郡上市八幡 35.7512N / 136.9567E（site-context docs/design/08・pyproj実測）
    // X(easting)=86,522.4 / Y(northing)=-27,181.2（Snyder級数近似の差±3m以内）
    const p = latLonToPlane(35.7512, 136.9567, 6674);
    expect(Math.abs(p.x - 86522.4)).toBeLessThan(3);
    expect(Math.abs(p.y - -27181.2)).toBeLessThan(3);
    const back = planeToLatLon(p.x, p.y, 6674);
    expect(Math.abs(back.lat - 35.7512) * 111320).toBeLessThan(2);
    expect(Math.abs(back.lon - 136.9567) * 111320 * Math.cos((35.7512 * Math.PI) / 180)).toBeLessThan(2);
  });

  it("southern zones (6682/6684/6686) match pyproj lat0", () => {
    // 第14/16系はlat0=26°・第18系はlat0=20°
    const cases = [
      { epsg: 6682, lat: 26.3, lon: 142.3, x: 29955.7, y: 33268.51 },
      { epsg: 6684, lat: 26.3, lon: 124.3, x: 29955.7, y: 33268.51 },
      { epsg: 6686, lat: 20.3, lon: 136.3, x: 31331.2, y: 33236.99 },
    ];
    for (const c of cases) {
      const p = latLonToPlane(c.lat, c.lon, c.epsg);
      expect(Math.abs(p.x - c.x)).toBeLessThan(5);
      expect(Math.abs(p.y - c.y)).toBeLessThan(5);
      const back = planeToLatLon(p.x, p.y, c.epsg);
      expect(Math.abs(back.lat - c.lat) * 111320).toBeLessThan(2);
      expect(Math.abs(back.lon - c.lon) * 111320 * Math.cos((c.lat * Math.PI) / 180)).toBeLessThan(2);
    }
  });

  it("unknown EPSG throws COORD-UNKNOWN-EPSG", () => {
    expect(() => latLonToPlane(35, 136, 9999)).toThrow(/COORD-UNKNOWN-EPSG/);
    expect(() => planeToLatLon(0, 0, 9999)).toThrow(/COORD-UNKNOWN-EPSG/);
  });
});