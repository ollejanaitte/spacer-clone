# 検証フレームワーク設計書

## 概要

SPACER Cloneの解析結果の信頼性を保証するための検証フレームワーク。

## 検証方針

### 理論値比較

基本的な梁理論との直接比較:
- 片持ち梁: δ=PL³/(3EI), Mmax=PL
- 単純梁: δ=PL³/(48EI), Mmax=PL/4
- 等分布荷重梁: δ=5wL⁴/(384EI), Mmax=wL²/8
- ねじり: θ=TL/(GJ)

### SPACER実機比較

将来SPACER実機出力を取り込み、直接比較するための仕組みを整備。

### 回帰試験

既存の検証モデルを定期的に実行し、解析精度の劣化を検出。

## 許容誤差

| カテゴリ | 相対誤差 | 絶対誤差 | 理由 |
|----------|----------|----------|------|
| 梁変位 | 1e-4 | 1e-10 | 基本梁理論との直接比較 |
| 梁反力 | 1e-4 | 1e-10 | 静的平衡との一致 |
| 梁モーメント | 1e-4 | 1e-10 | 断面力計算の精度 |
| 骨組変位 | 5e-2 | 1e-6 | 複雑な骨組効果 |
| 骨組反力 | 5e-2 | 1e-6 | 静的平衡 |

## 検証モデル構成

```
examples/verification/
├── beam/           # 梁系モデル
│   ├── cantilever_tip_load.json
│   ├── cantilever_tip_load.meta.json
│   ├── simple_beam_center_load.json
│   ├── simple_beam_center_load.meta.json
│   ├── simple_beam_uniform_load.json
│   ├── simple_beam_uniform_load.meta.json
│   ├── cantilever_torsion.json
│   └── cantilever_torsion.meta.json
├── frame/          # 骨組モデル
│   ├── portal_frame_horizontal.json
│   └── portal_frame_horizontal.meta.json
├── truss/          # トラスモデル
│   ├── simple_truss.json
│   └── simple_truss.meta.json
└── 3d-frame/       # 3次元骨組モデル
    ├── l_frame.json
    └── l_frame.meta.json
```

## メタデータ形式

各モデルに `.meta.json` ファイルを付与:

```json
{
  "name": "モデル名",
  "category": "beam|frame|truss|3d-frame|dynamic",
  "description": "説明",
  "modelPath": "モデルファイルパス",
  "parameters": { "E": 205000000, ... },
  "expected": {
    "displacements": { "N2": { "uy": -0.0104 } },
    "reactions": { "N1": { "fy": 10.0 } },
    "maxAbsMemberForce": { "Mz": 40.0 }
  },
  "tolerance": { "relative": 1e-4, "absolute": 1e-10 }
}
```

## 検証レポート出力

### CSV形式

`verification_report.csv`:
```csv
model,category,indicator,expected,actual,difference,error_rate,passed
Cantilever Tip Load,beam,displacement.N2.uy,-1.04065e-02,-1.04065e-02,0.00000e+00,0.00000e+00,true
```

`verification_summary.csv`:
```csv
model,category,passed,total_metrics,passed_metrics,failed_metrics
Cantilever Tip Load,beam,true,5,5,0
```

## SPACER比較

### 受入設計

将来SPACER結果を投入できる形式:

```
examples/spacer-reference/
├── beam/
│   └── cantilever_tip_load/
│       ├── displacement.csv
│       ├── reaction.csv
│       ├── member_force.csv
│       └── metadata.json
```

### CSV形式

`displacement.csv`:
```csv
case_id,node_id,ux,uy,uz,rx,ry,rz
LC1,N1,0,0,0,0,0,0
LC1,N2,-1.23e-05,-1.041e-02,0,0,0,-3.902e-03
```

`reaction.csv`:
```csv
case_id,node_id,fx,fy,fz,mx,my,mz
LC1,N1,0,10,0,0,0,40
```

## 回帰試験運用

### テスト実行

```bash
# バックエンド
cd backend && pytest tests/test_verification_framework.py -v
cd backend && pytest tests/test_regression_verification.py -v

# フロントエンド
cd frontend && npm test -- --run
```

### 自動検証

1. 解析エンジンの変更時に回帰テストを実行
2. 許容誤差を超えた場合はテスト失敗
3. テスト結果をCI/CDパイプラインに統合

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `verification/verificationReport.ts` | 検証レポート生成ロジック |
| `verification/verificationReport.test.ts` | レポート生成テスト |
| `verification/spacerReference.ts` | SPACER参照データパーサー |
| `verification/spacerReference.test.ts` | 参照データテスト |
| `backend/tests/test_verification_framework.py` | バックエンド検証テスト |
| `backend/tests/test_regression_verification.py` | 回帰検証テスト |
