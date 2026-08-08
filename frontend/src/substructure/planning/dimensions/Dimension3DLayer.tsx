// Phase C1 (M2-06) 3D 寸法マーカー（R3F Html）
// 表示座標は threeFactory と同じ Z-up → Y-up swap を適用する。
import { Html } from "@react-three/drei";
import type { DimensionMarker3D, DimensionSet } from "./dimensionModel";

export interface Dimension3DLayerProps {
  dimensions: DimensionSet;
}

function swap(v: { x: number; y: number; z: number }) {
  return [v.x, v.z, v.y] as const;
}

export function Dimension3DLayer(props: Dimension3DLayerProps) {
  return (
    <group data-testid="dimension-3d-layer">
      {props.dimensions.markers3D.map((m) => (
        <Html
          key={m.id}
          position={swap(m.position)}
          center
          distanceFactor={12}
          style={{ pointerEvents: "none" }}
        >
          <div
            data-testid={`dim3d-${m.id}`}
            style={{
              background: "rgba(10,20,35,0.75)",
              color: "#fbbf24",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              whiteSpace: "nowrap",
              border: "1px solid #f59e0b",
            }}
          >
            {m.label}
          </div>
        </Html>
      ))}
    </group>
  );
}
