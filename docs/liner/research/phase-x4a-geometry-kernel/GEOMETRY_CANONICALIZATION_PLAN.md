# GEOMETRY_CANONICALIZATION_PLAN — Canonical化計画

## 現状
LINERのGeometry計算は全て `frontend/src/liner/core/` にTypeScript実装として既存。
- 直線・円曲線・クロソイド：水平線形評価 `geometry/horizontal.ts`
- 測点↔座標：`stationAtPoint.ts`
- 縦断：`geometry/vertical.ts` + `elevationAt.ts`
- 3D座標変換：`coordinate3d.ts`
- ベクトル・Frame：`vector.ts` + `geometry/frame.ts`

## Canonical化方針
1. 既存TypeScript実装をCanonical Kernelとして維持（KEEP_AS_CANONICAL）
2. 型・単位・座標系契約を本ドキュメントで明示
3. backend Rule EngineからKernelを利用するための最小限のAdapterを `backend/rule_engine/geometry/` に追加
4. Rule Engineはbackend側Adapterを介してKernelを利用（直接TypeScriptを呼ばずPython interface経由）

## 対象外
- 既存TypeScript実装の書き換え
- 新しい計算アルゴリズムへの置換（既存bugの証拠がある場合を除く）
