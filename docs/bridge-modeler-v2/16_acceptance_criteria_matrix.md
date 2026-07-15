# 16 — Acceptance Criteria Matrix

Date: 2026-07-14  
Status: 計画文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md`  
Scope constraint: Phase 1〜5 全カバー。各行具体的手動・自動検証を規定。

---

## 1. 目的

Bridge Modeler V2 の受入条件を一覧化し、各行が具体的な入力・操作・期待結果・テスト方法を持つことで、Phase 1〜5 の全実装に対する検証基盤を提供する。

## 2. 識別子規則

- ID 採番: `AC-P{Phase}-{連番}` （例: `AC-P1-01`）
- Phase は 1〜5 で実装フェーズを示す
- 連番は Phase 内で通番

## 3. 受入条件一覧

### Phase 1: LINER Bridge Interval

| Requirement ID | Phase | Input/Precondition | Action | Expected result | Automated test | Manual test | Blocking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-P1-01 | P1 | LINER alignment 参照、開始終了測点を指定 | bridge interval を設定し、3D 座標を取得 | 開始・終了測点の XYZ 座標が alignment 上の正しい位置に一致 | Unit: `stationToXYZ` 正確性 | 3D preview で開始終了点が正しい位置に表示 | Yes |
| AC-P1-02 | P1 | bridge interval を設定済み | sourceRevision を変更 | stale detection が発火し警告が表示される | Unit: stale detection | alignment 変更後 UI に警告表示 | Yes |
| AC-P1-03 | P1 | LINER alignment 参照を選択 | start station > end station を入力 | validation エラーが発生し保存不可 | Unit: station range validation | 入力フィールドで逆順入力時にエラー表示 | Yes |
| AC-P1-04 | P1 | V2 document を保存済み | `VITE_BRIDGE_MODELER_V2=false` でリロード | V2 ルートが非表示になる | E2E: flag off | ブラウザで flag off 確認 | Yes |

### Phase 2: Bridge Structure

| Requirement ID | Phase | Input/Precondition | Action | Expected result | Automated test | Manual test | Blocking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-P2-01 | P2 | BridgeStructureModel に支承を 2 つ入力 | supports を追加 | 各 support に stable ID が生成され、重複がない | Unit: stable ID 一意性 | supports 入力後に ID 確認 | Yes |
| AC-P2-02 | P2 | supports を入力済み | 斜角支承線を設定 | skew angle が正しく反映され、validation 通過 | Unit: skew validation | 斜角支承を入力して 3D preview 確認 | No |
| AC-P2-03 | P2 | supports, girders, bearings を入力済み | section/material を変更 | 各部材に section/material が正しく割り当てられる | Unit: assignment | 部材選択後に section 確認 | No |
| AC-P2-04 | P2 | supports を 1 つだけ入力 | 保存を試行 | validation エラー: supports >= 2 必須 | Unit: min supports validation | 1 つの support で保存エラー確認 | Yes |
| AC-P2-05 | P2 | BridgeStructureModel を作成済み | project JSON を保存 | BridgeModelerV2Document が project JSON に保存される | Unit: serialize | 保存後に project JSON 確認 | Yes |

### Phase 3: FEM Generation

| Requirement ID | Phase | Input/Precondition | Action | Expected result | Automated test | Manual test | Blocking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-P3-01 | P3 | 曲線線形、縦断・横断勾配設定済み | FEM 生成を実行 | 主桁節点が縦断・横断勾配を反映した XYZ 座標を持つ | Unit: node XYZ 計算 | Viewer で節点位置確認 | Yes |
| AC-P3-02 | P3 | V2 document を保存・再読込 | document を再読み込み | stable ID が一致し、structure が復元される | Integration: save/load | 保存→再読込後に ID 一致確認 | Yes |
| AC-P3-03 | P3 | 支承位置を変更 | FEM 生成を実行 | AnalysisModel が dirty フラグを立てる | Unit: dirty detection | 支承変更後に dirty 状態確認 | Yes |
| AC-P3-04 | P3 | 同じ入力データで FEM を 2 回生成 | 2 回目の生成を実行 | 同じ stable ID が生成される | Unit: deterministic ID | 2 回生成後に ID 一致確認 | Yes |
| AC-P3-05 | P3 | ProjectModel と V2 structure を比較 | ID 対応表を確認 | IdCorrespondence が V2 ID → ProjectModel ID の対応を維持 | Unit: IdCorrespondence | 対応表の手動確認 | Yes |
| AC-P3-06 | P3 | piecewise offset で始端 ≠ 終端を指定 | FEM 生成を実行 | 節点 offset が線形補間される | Unit: offset interpolation | 節点 offset 値の確認 | Yes |
| AC-P3-07 | P3 | 長さ 0 のmember が生成される入力 | FEM 生成を実行 | zero-length diagnostic が blocking として発生 | Unit: zero-length diagnostic | zero-length 警告確認 | Yes |
| AC-P3-08 | P3 | 不正な支承線（交差なし）を設定 | FEM 生成を実行 | 交差なし diagnostic が発生 | Unit: intersection diagnostic | 不正支承線でエラー確認 | Yes |
| AC-P3-09 | P3 | V2 と Legacy の同じ入力データ | 各 FEM 生成を実行 | `/api/fem/generate` を V2 経路が呼ばない（スパイ/契約テスト） | Contract: API spy | V2 使用時に Legacy API 未呼出確認 | Yes |

### Phase 4: Load Surface

| Requirement ID | Phase | Input/Precondition | Action | Expected result | Automated test | Manual test | Blocking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-P4-01 | P4 | FEM 生成済み | DeckSurface を設定 | width, zones が正しく設定される | Unit: DeckSurface validation | deck 入力後に zones 確認 | No |
| AC-P4-02 | P4 | DeckSurface 設定済み | TrafficLoadZone を設定 | loadType が正しく割り当てられる | Unit: TLZ validation | TLZ 設定後に loadType 確認 | No |
| AC-P4-03 | P4 | TrafficLoadZone 設定済み | LoadPath を設定 | distribution factor 合計が 1.0 になる | Unit: distribution sum | distribution 確認 | No |
| AC-P4-04 | P4 | 中央分離帯を TLZ に含めようとする | TLZ 設定 | 中央分離帯が TLZ から除外される | Unit: TLZ exclusion | 中央分離帯の TLZ 除外確認 | Yes |

### Phase 5: Results / Drawing / DXF

| Requirement ID | Phase | Input/Precondition | Action | Expected result | Automated test | Manual test | Blocking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-P5-01 | P5 | FEM 結果が存在 | DrawingDocument を生成 | entity 数・種類・座標が preview と DXF で一致 | Parity: preview == DXF | preview と DXF の比較確認 | Yes |
| AC-P5-02 | P5 | FEM 結果が存在 | stale result を Viewer に送信 | stale result が Viewer 誤表示されない | Unit: stale result filter | 古い結果が表示されない確認 | Yes |
| AC-P5-03 | P5 | V2 document を保存・再読込 | roundtrip を実行 | `bridgeModelerV2` キーで roundtrip が成功する | Integration: roundtrip | 保存→再読込→整合確認 | Yes |
| AC-P5-04 | P5 | Legacy BridgeWizard が存在 | feature flag の有無で動作確認 | Legacy BridgeWizard が flag 有無で回帰しない | Regression: Legacy tests | Legacy Wizard 動作確認 | Yes |

## 4. Phase 別カウント

| Phase | AC 件数 | Blocking |
| --- | --- | --- |
| Phase 1 | 4 | 4 |
| Phase 2 | 5 | 3 |
| Phase 3 | 9 | 9 |
| Phase 4 | 4 | 1 |
| Phase 5 | 4 | 3 |
| **合計** | **26** | **20** |

## 5. 完了条件

1. 全 26 AC が具体的手動・自動検証を持つ
2. 各 AC に Blocking フラグが設定されている
3. Phase 1〜5 が全てカバーされている
4. 他ドキュメントへのリンクが正しい

---

## 関連ドキュメント

- [09_test_and_verification_plan.md](./09_test_and_verification_plan.md) — fixture 詳細、テスト戦略
- [11_traceability_matrix.md](./11_traceability_matrix.md) — REQ-AC リンク
