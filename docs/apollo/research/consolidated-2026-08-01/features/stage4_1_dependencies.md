# Stage 4 Part 1 Dependencies

## Evidence-based links

```text
新規作成(工事名) → フォルダ Align/Design/Draw
Align 線形計算 or .alg取込 → 縦断線確認 → 横断線/部材割当 → SuperDesigner継続
ハンチ計算(単位系) → 他設計プログラムの単位系
設計データ入力(MAN-005) → 主桁/床版/解析の下流
```

## Distinctions

| 項目 | 扱い |
|---|---|
| UI推奨順 | ガイド（MAN-002）。計算必然依存ではない |
| 横断線 vs 主桁配置 | 横断線は線形側、主桁間隔・本数は設計データ側 |
| 単位切替 | 自動変換なし |

## Upstream / Downstream (summary)

| Feature area | Upstream | Downstream |
|---|---|---|
| project_management | User | all design data |
| alignment* | Align/.alg | design geometry |
| unit_system | ハンチ指定 | all calc programs |
| girder_layout / standard_section | design data | analysis, section |
| bearing input | design data screen | checklist; design use LIMITED per MAN-005 |
