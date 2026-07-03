export const LINE_MASTER_HELP_TITLE = "基準ライン / 橋軸線マスタ";

export const LINE_MASTER_HELP_SECTIONS = [
  {
    id: "terms",
    title: "用語",
    body: `# 用語

## CL（Center Line）
道路中心線。横断面表の基準となる中心位置です。

## HCL（Highway Center Line）
高速道路の中心線。CL と同様に \`center\` 種別として扱います。

## G1 / G2
主桁線（girder）。桁番号付きのラベルは \`girder\` 種別として自動判定されます。

## HL1 など
縁端線（edge）。\`HL\` で始まるラベルは \`edge\` 種別として自動判定されます。`,
  },
  {
    id: "reference-mode",
    title: "参照方式",
    body: `# 参照方式の違い

## PDF行を橋軸線マスタにする（pdf-row-master）
PDF 本体表の行見出しをそのまま橋軸線マスタとして使います。写経入力の基本モードです。

## 中心線オフセット（centerline-offset）
中心線（CL）からのオフセット距離で各橋軸線を定義します。

## 絶対座標（absolute-coordinate）
各橋軸線を絶対座標で定義します。`,
  },
  {
    id: "csv",
    title: "CSV貼り付け",
    body: `# CSV貼り付け例

1行1橋軸線として貼り付けできます。

\`\`\`
CL
G1
G2
HL1
\`\`\`

- \`CL\` / \`HCL\` → center
- \`G*\` → girder
- \`HL*\` → edge
- その他 → custom`,
  },
  {
    id: "steps",
    title: "手順",
    body: `# 入力手順

1. PDF の橋軸線行見出しを確認する
2. 基準ライン名と参照方式を設定する
3. 行追加または CSV 貼り付けで橋軸線一覧を作成する
4. 種別・標準オフセットを必要に応じて調整する
5. 保存して次の画面へ進む`,
  },
] as const;
