# TH-10 ソルバ変更記録

## 対象

- `backend/engine/time_history_analysis.py`
- Newmark-β 本体 `time_history_newmark.py` は変更なし。

## 入力拡張

`analysisSettings.timeHistory.groundMotions.x/y/z` から有効方向と地震波 ID を解決する。旧 `direction` / `groundMotionId` は解析境界で schemaVersion 2 相当に正規化する。

各有効方向について既存の `assemble_effective_seismic_load_history` を呼び、生成された荷重履歴を線形加算する。

```text
P(t) = Px(t) + Py(t) + Pz(t)
Paxis(t) = -M raxis ag_axis(t)
```

未入力方向は加算対象がないためゼロベクトルとなる。符号規約は既存単方向解析を維持した。

## 数値積分

質量行列 M、Rayleigh 減衰行列 C、剛性行列 K、Newmark average acceleration 法の実装は再利用した。変更は外力履歴の構築とメタデータのみ。

## 結果

既存の成分履歴に加え、変位・速度・加速度ごとに `<node>_resultant` を保存する。

```text
resultant[i] = sqrt(x[i]^2 + y[i]^2 + z[i]^2)
```

単方向旧形式の `<node>` キーは維持し、方向付きキーと合成量を追加する。

## 検証

- C-1〜C-3: v2 単方向と旧形式を絶対誤差 `1e-9` で比較。
- C-4: X+Y の各成分を単方向結果と比較し、合成量を検証。
- C-5: X+Y+Z の各成分と3成分合成量を検証。
- C-6: frontend/backend の設定マイグレーションを検証。
- C-7: 旧 result の無変換表示を既存 Viewer 回帰テストで検証。
