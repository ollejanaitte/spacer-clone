# ID生成ポリシー

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`

---

## FEM ID (N{n}/M{n}/NL{n}/ML{n})

### 生成方法

| ID種別 | 初期値 | 生成パターン | 順序依存先 | 安定性 |
|--------|--------|-------------|-----------|--------|
| N{counter} | 1 | 外側ループ xi (x_positions順), 内側ループ yi (y_positions順) | x_positions × y_positions のネスト順 | **安定**（sorted済み） |
| M{counter} | 1 | 縦メンバー → 横メンバー | y_count, x_count 依存 | **安定** |
| NL{counter} | 1 | loads ループ内で連番 | project.loads 入力順 | **入力依存** |
| ML{counter} | 1 | 分布荷重時に members 走査で連番 | members 順序依存 | **安定** |

### 証拠

- **backend**: `bridge_fem_generator.py:159-169` (Node), `:173-215` (Member), `:264,282,308` (NL), `:265,345` (ML)
- **frontend**: `structuralModelGenerator.ts:236-252` (Node/Member), `:585,619` (NL), `:646` (ML)

### 重要

- 決定論的: 同じ入力 → 同じ ID
- `crypto.randomUUID()` は FEM ID 生成には使用されていない
- importer 内部 entity ID とは異なる名前空間

---

## UUID 使用箇所

| ファイル | 用途 | FEM ID に関与 |
|---------|------|-------------|
| `importerUtils.ts:15-16` | importer entity ID | **No** |
| `importerStorage.ts:75-76` | importer entity ID | **No** |
| `lineMasterHooks.ts:33-34` | girder-line ID | **No** |
| `ImporterProjectService.ts:41-42` | importer entity ID | **No** |
| `factory.ts:6-7` | importer entity ID | **No** |

---

## Viewer index

| 項目 | 値 | 根拠 |
|------|-----|------|
| payload | `ViewerModelPayload { nodes: number[][], edges: number[][] }` | `main.py:1091-1093` |
| 変換 | `node_id_to_index = {n["id"]: i for i, n in enumerate(fem["nodes"])}` | 同上 |
| 並べ替え耐性 | **なし**（配列インデックス依存） | — |
| Risk | **低**（一時的 payload、永続化なし） | — |

---

## 保存・再読込での ID 維持

| 項目 | 状態 | 根拠 |
|------|------|------|
| 保存対象 | BridgeProject（ID 未生成の状態） | `main.py:307-328` |
| 再生成 | `generate_fem_model()` を都度実行 | `main.py:1084` |
| 同一入力 → 同一 ID | **Yes**（静的判定可能） | counter=1開始、sorted済み |
| 入力変更 → ID 変化 | **可能性あり**（NL counter が変化） | loads 入力順依存 |

---

## ID 形式一覧

| エンティティ | ID形式 | 例 |
|-------------|--------|-----|
| Node | N{n} | N1, N2, N3 |
| Member | M{n} | M1, M2 |
| NodalLoad | NL{n} | NL1, NL2 |
| MemberLoad | ML{n} | ML1, ML2 |
| LoadCase | LC{n} | LC1 (手動) |
| Material | string | MAT_DECK (手動) |
| Section | string | SEC_DECK (手動) |
| Importer entity | {prefix}-{uuid} | bridge-a1b2c3d4-... |
| Bridge ID | string | `^[A-Za-z0-9_-]{1,64}$` |
