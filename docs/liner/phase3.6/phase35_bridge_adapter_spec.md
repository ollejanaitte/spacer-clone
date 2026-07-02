# Phase 3.6 to Phase 3.5 Bridge Adapter Spec

## 0. 変換方向

変換方向は Phase 3.6 importer JSON から Phase 3.5 vNext draft への片方向のみである。

```text
JipLinerImporterProject -> LinerDomainDraftVNext
```

逆変換、JIP-LINER `.LIN` 生成、JIP-LINER PDF 生成は本フェーズの非スコープである。

## 1. Adapter の責務

Adapter は Phase 3.6 側に置く。

責務:

- importer JSON の schema version を確認する。
- 必須メタデータ、座標系、橋梁、section、point を検証する。
- 補助入力 `AlignmentMetadata` がある場合は Phase 3.5 vNext draft の同型 field へ写像する。
- 補助入力が不足する場合は、点群から推定できる範囲だけ draft を生成し、推定不能箇所を warning / error として残す。
- 変換ログを保存する。
- Phase 3.5 の 6 タブや pipeline 実装に importer 固有 field を要求しない。

## 2. 写像仕様

| Phase 3.6 source | Phase 3.5 target | 変換 |
|---|---|---|
| `alignmentMetadata.plan` | `domainDraft.alignment` | 同型 copy。要素 ID の重複だけ adapter で正規化 |
| `alignmentMetadata.profile` | `domainDraft.verticalAlignment` | 同型 copy。station 範囲と section 範囲の整合を検査 |
| `alignmentMetadata.crossSlope` | `domainDraft.crossSections` / crossfall data | 既存 vNext の cross-section 表現に丸める |
| `bridges[].spans` | `domainDraft.spans` | span range と girderLineSet を変換 |
| `sections[].spanId` | `domainDraft.spans[].sectionRefs` | `null` の場合は Warning とし、エクスポートは継続可能 |
| `sections[].stationingRef` | `domainDraft.gridDefinitions` | section station を grid station 候補として登録 |
| `sections[].points[]` | `domainDraft.gridDefinitions` / confirmation data | 測点、断面高さ、幅員、座標点の根拠として使用 |
| `coordinateSystem` | `coordinatePolicyId` | 既存 project 側 policy に対応。未登録なら warning |
| `sourceRef` | conversion log | draft 本体ではなく log に集約 |

## 3. 補助入力がある場合

`AlignmentMetadata` の plan / profile / crossSlope が揃っている場合、adapter は Phase 3.5 vNext draft を通常の計算入力として生成する。

生成方針:

- `domainDraft.alignment.elements` は `alignmentMetadata.plan.elements` から作る。
- `domainDraft.verticalAlignment.elements` は `alignmentMetadata.profile.elements` から作る。
- `domainDraft.crossSections` は girder line master と crossSlope 定義から作る。
- `domainDraft.gridDefinitions` は section station と girder line master から作る。
- `domainDraft.spans` は importer span を対応づける。
- `domainDraft.piers` はピア/スパン確認画面の支点情報から作る。
- `generationSettings` と `sampling` は Phase 3.5 既定値を採用する。

## 4. 補助入力が欠ける場合

点データのみでは、平面線形の R/A、縦断曲線、横断勾配変化点を一意に復元できない場合がある。

扱い:

| 欠落 | adapter の動作 | 診断 |
|---|---|---|
| `plan` なし | section 点群を確認用点列として保持し、計算用 alignment 生成は行わない | Error |
| `profile` なし | 計画高は section point の値を保存するが縦断要素は生成しない | Warning または Error |
| `crossSlope` なし | crossSlope column から section ごとの局所値を保持し、連続定義は生成しない | Warning |
| station 欠落 | gridDefinition 生成を停止 | Error |
| `********` 混在 | null と flags を見て対象外値として扱う | Info / Warning |

点群から内挿する場合でも「計算再現」とは扱わない。adapter は内挿値を生成する場合、必ず conversion log に `inferred: true` を残す。

点群からの内挿は線形補間のみを許可する。高次補間は Phase 3.6 の adapter では実施しない。内挿値は conversion log に `inferred: true` と補間方式 `interpolation: "linear"` を残す。

## 5. Phase 3.5 pipeline への引渡し

Phase 3.5-4 の PR-A〜PR-E で 3D pipeline / grid / frame 接続が完了していることを前提にする。

引渡し手順:

1. importer JSON を検証する。
2. adapter が `LinerDomainDraftVNext` を生成する。
3. Phase 3.5 の既存 save path に `liner.domainDraft` として新規 draft を保存する。
4. Phase 3.5 pipeline を通常 draft として実行する。
5. pipeline diagnostics と importer diagnostics を別系統で表示する。

## 6. 変換ログ

変換ごとに以下を保存する。conversion log は importer JSON 本体に含めず、別ファイル `<project>.conversion.log.json` として保存する。

```ts
interface ImporterConversionLog {
  id: string;
  importerProjectId: string;
  bridgeId: string;
  sourceImporterSchemaVersion: "0.1.0";
  targetDraftSchemaVersion: string;
  convertedAt: string;
  convertedBy?: string | null;
  diagnostics: AdapterDiagnostic[];
  sourceRefs: SourceRef[];
  inferredValues: Array<{
    targetPath: string;
    reason: string;
    sourcePaths: string[];
    inferred: true;
    interpolation?: "linear";
  }>;
}
```

ログはユーザーが「どの PDF ページのどの行列から Phase 3.5 draft ができたか」を追跡できることを目的にする。Phase 3.5 draft と importer JSON の payload を肥大化させないため、詳細 sourceRef は log 側に集約する。

## 7. 停止条件

以下の場合は変換を停止する。

- importer schema version が未対応。
- 橋梁が 0 件。
- 対象 bridge の section が 0 件。
- station が全 section で解決不能。
- plan alignment がなく、Phase 3.5 pipeline 入力を生成できない。
- Phase 3.5 vNext schema と importer data が M5 の写像で吸収不能に衝突する。
