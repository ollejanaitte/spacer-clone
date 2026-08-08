# UX-REAUDIT P06 — Live Preview / Field Mapping / Error Visualization（凍結）

Status: FROZEN

## 1. Purpose
模式図と入力の双方向連動（フィールド↔図マッピング）、
ライブプレビューの状態分離、エラー/警告の視覚化仕様を横断的に確定する。

各画面固有の詳細は UX-P01〜P05 を参照。本設計は共通ルール。

## 2. 既存正本（再利用）
- `frontend/src/liner/core/diagnostics.ts` の `LINER_DIAGNOSTIC_CODES`
  （ジオメトリ不連続・station範囲・profile・crossfall・width・pier・span 等の診断コード）
- 既存各 DiagnosticsPanel（Continuity / Vertical / CrossSection / BridgeLayout / Haunch / Hoso / Ldist）
- `LinerGridPreview` / `CrossSectionPreview` / `VerticalProfileChart`（SVG 図）
- `CompositionAwareInput`（入力補助）

## 3. LIVE PREVIEW 状態（横断仕様・凍結）
| 状態 | 定義 | 図の表示 |
|------|------|----------|
| INPUT PREVIEW | 数値入力中の即時反映（近似・簡略可） | 図は軽量再描画、近似であることを表示 |
| VALIDATED PREVIEW | 入力の範囲・型・連続性チェック通過 | 図にバリデーション OK 表示 |
| CALCULATED RESULT | 正式計算（backend X4/Step2）の結果 | 図に計算値・主要点・診断を重ねて表示 |

原則:
- INPUT PREVIEW で近似・簡略表現を使う場合は「近似プレビュー」バッジを明示
- CALCULATED RESULT は production 計算結果であり、INPUT PREVIEW と混同しない
- 計算トリガー: 入力 debounce（例 300ms）+ 明示的な「計算実行」ボタン

## 4. FIELD → DIAGRAM MAPPING（横断仕様・凍結）
- 各画面（UX-P01〜P05）の mapping 表を共通規約で適用:
  - 入力欄フォーカス → 図中対応要素をハイライト（強調色 + ラベル）
  - 図中要素クリック/ドラッグ → 対応入力欄へ値を反映（双方向）
- 双方向連動の実装は frontend 状態管理（選択中のフィールドID ↔ 図中要素ID）
- 対応関係は一意（同じ概念を別記号で表現しない）

## 5. 共通ビジュアル規約（凍結）
| 状態 | 表示 |
|------|------|
| 選択中 | 強調色（既定: #2563eb 青）+ 太線 |
| 編集中フィールド | 図中対応対象をパルス/点滅（アクセシビリティ配慮で色以外も併用） |
| 警告 | #d97706 黄（該当要素 + 図中マーカー） |
| エラー | #dc2626 赤（該当要素 + 図中マーカー） |
| 無効値 | グレーアウト + 破線 |
| 実値/計算値の比較 | 実値=青系、計算値=緑系（Replay 画面） |

## 6. ERROR / WARNING 視覚化（FIELD ERROR と GEOMETRY ERROR の区別）
| 種別 | 定義 | 表示 |
|------|------|------|
| FIELD ERROR | 単一フィールドの入力値エラー（範囲外・型・非有限） | 欄赤枠 + 図中対応要素を赤 |
| GEOMETRY ERROR | 要素間の幾何的不整合（不連続・範囲外・重複・方向不整合） | 図中該当箇所を赤 + 診断コード表示 |
| WARNING | 基準未達・Rule 照査警告（曲線長・拡幅・勾配・clearance） | 欄黄 + 図中該当要素を黄 |

- 診断コード: 既存 `LINER_DIAGNOSTIC_CODES` を正本とし、図中エラーにコード+メッセージを表示
- エラー位置を幾何的に特定できる場合は必ず図示（station 範囲外→図の station 範囲外に赤帯）

## 7. 各領域の図示対象（診断コード対応）
| 領域 | 図示するエラー例 |
|------|------------------|
| Horizontal | position/azimuth 不連続・clothoid 無効R・station 範囲外 |
| Vertical | 標高/勾配不連続・被覆ギャップ・勾配超過 |
| Cross Section | crossfall 重複/不正・width 重複/範囲外・pivot 不整合 |
| Bridge | pier 重複・bearing offset 不正・span 反転/範囲超過 |
| Output/Replay | replay FAIL 位置・出力不能（NaN） |

## 8. パフォーマンス
- 図は SVG、編集中は対象要素のみ再描画（全体再描画は計算実行時）
- debounce とバージョン管理（INPUT PREVIEW / VALIDATED / CALCULATED を別バージョンで保持）
- 大測点数の station 表示は LOD（低密度→高密度ズーム）

## 9. Accessibility
- 色以外の表現（マーカー形状・線種・アイコン・テキスト）を併用
- 図の aria-label・role（既存 LinerGridPreview 踏襲）
- キーボード操作（図内要素 Tab フォーカス → Enter 選択）

## 10. Acceptance Criteria
- [ ] 全入力画面でフィールド↔図の双方向連動が動作
- [ ] INPUT / VALIDATED / CALCULATED の3状態が明確に区別表示
- [ ] FIELD ERROR / GEOMETRY ERROR / WARNING が図とフォーム両方に表示
- [ ] エラーに診断コードが付与
- [ ] パフォーマンス要件（debounce・LOD）を満たす
- [ ] 色覚対応（色以外の表現）

## 11. Traceability
- UX-P01〜P05 の各画面設計
- frontend/src/liner/core/diagnostics.ts（LINER_DIAGNOSTIC_CODES）
- 各 DiagnosticsPanel
