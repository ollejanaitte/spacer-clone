# Phase A — 04 解析モデル化ルール 凍結

**Authority:** Phase A integrated freeze (A4)
**Date:** 2026-08-02
**Step:** A4 — 解析モデル化ルール
**Integration base:** DS-06 (`docs/apollo/design-standards/06_analyzer/`), phase1_design_expansion_refreeze (`scope_and_architecture_freeze.md` §5.4), AP-DX-01, A3（荷重・組合せ）
**Adoption vocabulary:** DS-00 `adoption_status_model.md` と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**解析モデル化ルール**を再凍結する。既存 DS-06 / AP-DX-01 の決定を書き換えず、参照整合を保持する。

**Phase A の方針:** 解析モデルは**設計モデルから派生**させる。リポジトリ内 solver の慣行は `PROJECT_SPECIFIC`、外部 APOLLO Analyzer / SPACER の物理契約は `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。解析結果は設計照査へそのまま束縛できない（AN-BLK-004 等）。

---

## 1. 解析モデルの生成規則（phase1 再凍結 §5.4）

解析モデルは設計モデル（BridgeSuperstructureDesignDocument）から派生させる。

| 構成要素 | 内容 |
|----------|------|
| 節点 | 座標・自由度束縛 |
| 部材 | 設計部材からマッピング |
| 支点条件 | 支承・固定条件 |
| 断面剛性 | 材料・断面から生成（仮定剛度と断面決定後を区別） |
| 材料 | DS-03 参照（数値は BLOCKED） |
| 荷重ケース | A3（DS-04）参照 |
| 荷重組合せ | 汎用シェルのみ（未採択） |
| 出力要求 | 断面力・変位・反力 |

- 3D 表示用メッシュを解析モデルの**正本にしない**。描画モデルと解析モデルは共通 ID で対応付ける。
- 解析結果は設計部材へ割り当て、設計照査に使う（設計エンティティと解析部材のマッピングが必要）。

### 1.1 設計モデル→解析モデル変換の対象（MT-060..064）

| MT | 旧Apollo 章 | 対象 | 位置づけ | 状態 |
|----|------------|------|----------|------|
| MT-060 | Grider_I_06 §6 | 主桁仮定剛度 | 断面からの剛性生成と仮定値を区別 | `NOT_AUTHORIZED`（PARTIAL） |
| MT-061 | Grider_I_06 §6 | 横桁・対傾構仮定剛度 | 床組解析モデル部材マッピング | `NOT_AUTHORIZED`（PLANNED） |
| MT-062 | Grider_I_06 §6 | 仮定鋼重 | 設計鋼重と分離 | `NOT_AUTHORIZED`（PLANNED） |
| MT-063 | Grider_I_06 §6 | 骨組任意指定 | Phase 1 では限定的 override のみ | `NOT_APPLICABLE`（DEFERRED） |
| MT-064 | Grider_I_06 §6 | 構造解析・断面力変換 | 既存内部 solver / IF3 再利用 | `NOT_APPLICABLE`（PARTIAL） |
| MT-140 | JIP-SPACER | 解析データ作成・描画・帳票 | Frame 解析・結果・図形の参考 | `REFERENCE_ONLY` |

旧Apollo の仮定剛度・仮定鋼重・任意指定は、処理順の参考に限定し、数値・既定値をそのまま移植しない。

---

## 2. 解析器の同一性（DS-06 analyzer_identity_register）

| ID | 名称 | クラス | 状態 |
|----|------|--------|------|
| AN-ID-001 | リポジトリ Python 線形静的解 | IN_PROCESS_LIBRARY | `PROJECT_SPECIFIC` |
| AN-ID-002 | FastAPI 解析アダプタ（POST /api/analysis/run） | HTTP_SERVICE_ADAPTER | `PROJECT_SPECIFIC` |
| AN-ID-003 | IF3 正規化・永続化 | RESULT_ADAPTER | `PROJECT_SPECIFIC` |
| AN-ID-004 | 歴史的 APOLLO Analyzer | EXTERNAL_PRODUCT_OR_SUBSYSTEM | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AN-ID-005 | SPACER 製品シェル | REFERENCE_SOFTWARE_PRODUCT_CANDIDATE | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AN-ID-006 | SPACER STATICS モジュール | REFERENCE_SOFTWARE_MODULE_CANDIDATE | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AN-ID-007 | フロントエンド fake 解析プレースホルダ | UNIMPLEMENTED_PLACEHOLDER | `REFERENCE_ONLY` |

- リポジトリ solver を歴史的 APOLLO Analyzer や SPACER と呼んではならない。
- HTTP 成功は解析成功ではない。`analysisSummary.status` と IF3 の status/diagnostics を評価する。
- バックエンド互換 CSV は**権威でない**。Live-source IF3 gate を経た CSV/PDF のみ権威。

---

## 3. 解析器の物理契約（DS-06 ブロッカー）

外部 Analyzer の実行形式名/パス・製品/版・チェックサム・引数・環境・作業ディレクトリ・入出力ファイル・エンコーディング・改行・上書き規則・stdout/stderr・終了コード・エラーファイル・ライセンス挙動・タイムアウト/キャンセル・クリーンアップ・並行・クラッシュ復旧・stale 出力拒否・決定性再現性は、**全て `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`**（AN-BLK-001..011）。

| Blocker | 対象 |
|---------|------|
| AN-BLK-001 | 同一性（製品・版・ビルド・モジュール関係） |
| AN-BLK-002 | 起動・物理ファイル |
| AN-BLK-003 | 単位・テキスト表現（入力単位束縛・ロケール） |
| AN-BLK-004 | 座標・DOF・I-J・符号 |
| AN-BLK-005 | エラー終了・ライセンス |
| AN-BLK-009 | 派生エクスポート権威 |
| AN-BLK-010 | 荷重ケース/組合せマッピング |

---

## 4. 単位・座標・DOF・符号（DS-06 リポジトリ観察 = PROJECT_SPECIFIC）

リポジトリコードに**現に観察される**約束（外部製品の約束に移転しない）:

| 面 | 観察 |
|----|------|
| 節点座標 | `x`, `y`, `z` |
| 節点 DOF 順 | `ux, uy, uz, rx, ry, rz` |
| 部材端順 | `nodeI` → `nodeJ`（I 6成分 + J 6成分） |
| 節点荷重順 | `fx, fy, fz, mx, my, mz` |
| 部材分布荷重 | `wx, wy, wz` + `coordinateSystem` |
| ローカル x | nodeI → nodeJ 方向 |
| 反力 | `K u - f`（拘束 DOF） |
| 生の部材端力 | `k_local u_local - f_equivalent`、I 6 + J 6 |

**結果の設計照査への束縛前要件:**
1. 各並進力・モーメント・変位・回転・部材端力・反力成分の正単位荷重プローブを作成
2. グローバル/ローカル/支点基底と右手系を記録
3. 当該基底で平衡を検証
4. 部材端作用が element-on-node か node-on-element かを明記
5. I/J の順序・符号変換を明記
6. 各変換を版・チェックサムへ束縛

プローブが通るまで、外部の単位・支点座標・I/J・部材力・モーメント・反力符号は `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（AN-BLK-004）。

- 単位束縛は AN-BLK-003 で BLOCKED。IF3 のラベル（displacement `m/rad`、force `kN/kN_m`）は**ラベルのみ記録**であり、数値束縛を採用しない。
- 表示丸めから符号・座標マッピングを推測しない。ビューアの符号変換は表示ロジックであり外部製品の約束の証跡ではない。

---

## 5. 荷重ケース / 組合せマッピング（AN-BLK-010）

- リポジトリ raw solver は名前付き `loadCases` を反復。IF3 B1 正規化は線形静的解の `loadCase` コンテキストのみ受付。
- `loadCombination` kind の実装サポートは未証明。組合せを荷重ケースへ平坦化・改名・変換してはならない。
- 外部 Analyzer の荷重ケース/組合せマッピング、リポジトリ→外部マッピングは `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。

---

## 6. STALE 規則（phase1 再凍結 §10）

以下は解析結果を STALE にする:

- 主桁位置・支間・支点条件
- 主桁断面・材料・剛性
- 横桁・対傾構・横構の配置または断面
- 荷重
- 床版・舗装・ハンチ重量
- 鋼重更新

以下は原則として図面のみ STALE: 文字位置・寸法線配置・表示尺度・図枠。

---

## 7. 数値・式・条項の状態まとめ

| 分類 | Adoption status |
|------|-----------------|
| 解析モデルは設計モデルから派生（生成規則） | `ADOPTED`（governance） |
| リポジトリ solver の入出力契約 | `PROJECT_SPECIFIC` |
| 外部 Analyzer / SPACER の物理契約 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 単位束縛・ロケール | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 座標・DOF・I-J・符号 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 荷重ケース/組合せマッピング | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 断面剛性・材料数値 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（DS-03） |
| 解析結果の設計照査束縛 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（プローブ必須） |
| 数値実装許可 | `NOT_AUTHORIZED`（A7） |

---

## 8. A4 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存 DS-06 / AP-DX-01 / phase1 再凍結の決定を書き換えていない | PASS |
| リポジトリ観察（DOF順・部材端順等）が DS-06 と一致 | PASS |
| 外部解析器の物理契約を捏造していない（全 BLOCKED） | PASS |
| 数値を捏造していない | PASS |
| SPACER / 旧Apollo を数値権威にしていない（REFERENCE_ONLY） | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 長文の基準本文転載なし | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 未完の TODO / TBD なし | PASS |

---

## 9. A4 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0011 | 2026-08-02 | Phase A の解析モデル化ルールは「設計モデルから派生」「リポジトリ solver は PROJECT_SPECIFIC」「外部解析器は BLOCKED」という DS-06 / phase1 再凍結の位置づけをそのまま採用する。解析結果はプローブ通過まで設計照査へ束縛しない。 |
| DEC-PHA-0012 | 2026-08-02 | 解析に使う断面剛性・材料・荷重の数値は DS-03/DS-04 の BLOCKED を維持する。旧Apollo 仮定剛度・仮定鋼重・任意指定は処理順の参考のみとし、数値移植しない。 |
