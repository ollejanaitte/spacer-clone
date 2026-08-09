# 06 CANONICAL / RESULT / CACHE 分類（P6）

> 保存対象を3類+UNKNOWNに分類。各クラスの 保存先/バックアップ/package/migration/削除/再生成 を定義。
> 分類は 006 棚卸し + Step4-2 source-of-truth 表 + contract `validate*` に基づく。

## 1. 分類定義

| 区分 | 定義 | 例 |
|------|------|-----|
| **A. CANONICAL / SOURCE** | 絶対に失ってはいけない正本・ユーザー入力。canonical JSON / バイト不可逆。 | BusinessProject manifest, Road(road-design), BridgeProject(CBDM+manifest+superstructure+substructure), Analysis document, coordinate/unit context |
| **B. RESULT / EVIDENCE** | 計算/設計結果・証跡。再計算できるが履歴証拠として永久保存対象。 | displacements/reactions/member force/quantity/design result/audit/calculation report, persisted-result |
| **C. CACHE / REGENERATABLE** | 削除しても再生成できる。保存してもいいが不要。 | viewer cache, thumbnail, preview, temporary geometry, intermediate snapshot, STL export cache |
| **UNKNOWN** | 分類不能。正本にはしない。要調査。 | （現段隊なし） |

## 2. 対象別分類 + ポリシー

| 対象 | 分類 | 保存先 | backup | package | migration | 削除可 | 再生成 | 備考 |
|------|------|--------|--------|---------|-----------|--------|--------|------|
| BusinessProject manifest | A CANONICAL | root business-project.json | 対象 | 含む | 対象(schemaVersion) | × | × | canonical JSON, checksum |
| ProjectMetadata | A (manifest in) | manifest 内 | 対象 | 含む | 対象 | × | × | separate file 化しない |
| Road design doc | A CANONICAL | roads/*.road.json | 対象 | 含む | 対象 | × | × | road-design canonical |
| RoadSection entity | A (in-doc) | road doc 内 | 対象 | 含む(road doc) | road doc に従う | × | × | doc 内 stable entity |
| Alignment entity | A (in-doc) | road doc 内 | 対象 | 含む | 同上 | × | × | |
| BridgeProject CBDM | A CANONICAL | bridges/*//cbdm.json | 対象 | 含む | 対象 | × | × | Protected Core |
| BridgeProject manifest | A CANONICAL | bridges/*//manifest.json | 対象 | 含む | 対象 | × | × | Protected Core |
| Superstructure (BSDD) | A CANONICAL | bridges/*//superstructure.json | 対象 | 含む | 対象 | × | × | Protected Core |
| Substructure | A CANONICAL | bridges/*//substructure.json | 対象 | 含む | 対象 | × | × | Protected Core |
| Analysis document | A CANONICAL | analyses/*//document.json | 対象 | 含む | 対象 | × | × | bridge-frame-analysis |
| Analysis settings/model | A (in analysis doc) | analysis doc | 対象 | 含む | 対象 | × | × | |
| AnalysisResult | B RESULT | analyses/*//results/*.persisted-result.json | 対象 | 含む(default) / 除外可 | 対象 | △(user) | ○ | checksum 保持 |
| displacement/reaction/member force | B RESULT | AnalysisResult doc 本体+resources/ | 対象 | 含む | 対象 | △ | ○ | |
| design result / quantity | B RESULT | analyses/results/ + resources/ | 対象 | 含む | 対象 | △ | ○ | |
| audit / calculation report | B RESULT | deliverables/ + resources/ | 対象 | 含む | 対象 | △ | ○ | |
| Terrain binary (tif/laz) | A CANONICAL | resources/<sha>.<ext> | 対象 | 含む | 対象(ext保持) | × | × | immutable content-addressed |
| Existing/imagery/binary | A CANONICAL | resources/<sha>.<ext> | 対象 | 含む or 参照 | 対象 | × | × | (入力原本) |
| PDF原本 / STL (入力) | A CANONICAL | resources/<sha>.<ext> | 対象 | 含む or 参照 | 対象 | × | × | |
| Deliverable doc | B RESULT | deliverables/*//deliverable.json | 対象 | 含む | 対象 | △ | ○(regen) | sourceRefs 保持 |
| Deliverable artifact bytes | B RESULT | resources/<sha>.<ext> (deliverable via ref) | 対象 | 含む or 参照 | 対象 | △ | ○(regen) | |
| viewer cache (scene/thumbnail) | C CACHE | .system/cache/ | 除外 | 除外 | 対象外 | ○ | ○ | regenerable |
| preview / temporary geometry | C CACHE | .system/cache/ or .system/autosave/ | 除外 | 除外 | 対象外 | ○ | ○ | |
| autosave candidate | B mix | .system/autosave/ | 除外 | 除外 | 対象外 | ○(after commit) | ○ | crash recovery 材料 |
| recovery journal | B mix | .system/recovery/ | 除外 | 除外 | 対象外 | ○(after commit) | △ | crash detection |
| history log | B RESULT(log) | .system/history/ | 対象(optional) | 含む(history) | 対象 | × | × | append-only |

## 3. 分類ポリシー原則

- **A CANONICAL** は: canonical JSON（キー sort, NaN/Infinity 拒否, sha256 checksum）+
  `validate*（fail-closed）` による検証。保存後 readback+checksum verify。
- **A CANONICAL / C CACHE** は**物理分離**（`resources/` は内容追跡；`.system/cache/` は削除可）。
- **B RESULT** は正本と同じく checksum 管理。再生成可能だが**証跡としては保管**。
  package 時は default `include` だが、巨大な解析結果は `exclude` オプション。
- **C CACHE** は package/import から**除外**。`.system/` 全体は portable 対象外
  （autosave/history は別途 include 可能）。
- **UNKNOWN** は判定前に CANONICAL 扱いを**避ける**（Step4-2 P5「分類不能は正本扱いしない」）。

## 4. 粒度での壊れにくさ

- doc 1つの破損 → その doc を fail-closed 孤立。manifest は他参照を保ち**業務全体を失わない**
  （Case 12）。manifest 自体の破損 → `.system/history` + 子 doc scan で**reconstruct**可
  （Case 11）。
