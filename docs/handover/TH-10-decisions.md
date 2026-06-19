# TH-10 暫定判断

## 2026-06-19

- 未コミットの `backend/data/projects/autosave.json` はユーザー作業と判断し、全 Phase のコミット対象から除外する。
- Phase-1 の現行文字色は既に WCAG AA を満たすが、用途別トークンが不足しているため、値の明度改善と primary/secondary/placeholder/chip の分離を実施する。
- コントラスト検証は時刻歴 UI で最も明るい通常背景 `#1d2b45` を最悪条件として固定する。
- Viewer の px 表示は既存内部 world-unit scale と分離せず、UI 値を表示用スケールへ変換する互換レイヤーを Phase-2 で設ける。
- 3方向入力の符号は既存実装 `P(t) = -M r ag(t)` を維持する。要求式の加算は各方向の既存有効荷重を重ね合わせることで実現する。
