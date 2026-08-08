# 上部工簡略化の整理（Phase 3-3）

過去の上部工 deferred / simplification を、BridgeProject binding との関係で分類。

| 項目 | 分類 | 対応 |
|------|------|------|
| support 位置（RB-001 は span 累積） | **RESOLVED_BY_BINDING** | bound 時は CBDM の global station を正準採用 |
| skew 未モデル化（engine は 0 固定だった） | **RESOLVED_BY_BINDING** | per-support skew（CBDM CONFIRMED）を採用 |
| 平面曲線の直線近似 | **RESOLVED_BY_BINDING** | 実線形（LINER）を `LinerAlignmentConnector` で評価（curve も正確） |
| 橋長・支間（ハードコード） | **RESOLVED_BY_BINDING** | CBDM bridgeLength / spanLengths から |
| deck width（ハードコード） | **RESOLVED_BY_BINDING** | CBDM deck widthM（cross-section 由来）から |
| deck thickness | **STILL_DEFERRED** | SUPERSTRUCTURE 入力（CBDM に無し）。NOT_AVAILABLE 明示 |
| girder offsets | **STILL_DEFERRED（SUPERSTRUCTURE 入力）** | binding 対象外。invent 禁止 |
| 中間格点 HOLD | **STILL_DEFERRED** | gridPanelSpecs が CBDM に無い。endpoint-only（HOLD）のまま |
| 縦断・横断勾配 | **STILL_DEFERRED（受け渡し済み・未消費）** | AlignmentConnector が grade/crossfall を返すが engine は未使用 |
| 端部桁高近似 | **BLOCKED_BY_SUPERSTRUCTURE_ENGINE** | 設計エンジン（NOT_AUTHORIZED）依存 |
| 反力 / 設計照査 | **BLOCKED_BY_SUPERSTRUCTURE_ENGINE** | NOT_GRANTED（数値認証前） |
| grid panel / cross girder / sectionStations | **NOT_IN_SCOPE**（SAMPLE mode 専用 RB-001 定数） | Phase 3-4+ |
| 曲線の多径間連続 | **NOT_IN_SCOPE** | 新構造形式 |

## 補足

- RESOLVED_BY_BINDING は **BRIDGEPROJECT_BOUND モードで有効**。SAMPLE（RB-001）モードは従来のまま。
- 上部工の正式数値設計は未認証のまま。binding 成功 ≠ 設計完成。
