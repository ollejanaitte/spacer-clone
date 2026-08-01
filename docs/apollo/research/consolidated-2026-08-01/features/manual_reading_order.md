# Manual Reading Order (Stage 4 用・仮案)

根拠: Stage2 処理順序 + 非合成コントロール配置（MAN-002）+ 分冊章立て（MAN-001）。

## Layer 0 — システム概要・全体処理・共通条件
| Order | Manual ID | 目的 |
|---|---|---|
| 0.1 | MAN-021 | APOLLO構成、ファイル形式、単体一覧、フォルダ |
| 0.2 | MAN-002 | コントロール画面・実行推奨ガイド・入力方針 |

## Layer 1 — 入力・形状・基本条件
| Order | Manual ID | 目的 |
|---|---|---|
| 1.0 | MAN-001 | 章マップ |
| 1.1 | MAN-003 | 線形 |
| 1.2 | MAN-004 | ハンチ |
| 1.3 | MAN-005 | 設計データ入力・変更 |

## Layer 2 — RC床版・主桁・床組・横組
| Order | Manual ID | 目的 |
|---|---|---|
| 2.1 | MAN-006 | RC床版 |
| 2.2 | MAN-008 | 断面計算 |
| 2.3 | MAN-009 | 添接計算 |
| 2.4 | MAN-010 | たわみ剛比 |
| 2.5 | MAN-011 | 床組（横桁・対傾構・横構） |
| 2.6 | MAN-012 | 主桁補剛材 |

## Layer 3 — Analyzer連携・断面力・照査
| Order | Manual ID | 目的 |
|---|---|---|
| 3.1 | MAN-007 | 格子解析・断面力変換 |
| 3.2 | MAN-014 | 疲労照査（Phase1任意度高） |

## Layer 4 — Section・Splice・補剛材・ダイヤフラム
| Order | Manual ID | 目的 |
|---|---|---|
| 4.1 | MAN-062 | Section単体（優先）。MAN-061は差分SUPPORT |
| 4.2 | MAN-061 | Section別冊（版未確定） |
| 4.3 | MAN-063 | Splice単体 |
| 4.4 | （MAN-021単体一覧） | Sdia/Idia 要否は Stage4 で確認 |

## Layer 5 — 帳票・製図・数量・材料
| Order | Manual ID | 目的 |
|---|---|---|
| 5.1 | MAN-013 | 鋼重・数量 |
| 5.2 | MAN-021（製図・材料節） | SuperDrawing / NPDATA / y-Mater |
| 5.3 | MAN-002 ユーティリティ | 照査リスト |

## Interpretation
順序は操作ガイドと章立てに基づく仮案。再実行分岐は Stage4 で更新。

## Unknown
支承専用資料の位置、ダイヤフラムのPhase1必須性。
