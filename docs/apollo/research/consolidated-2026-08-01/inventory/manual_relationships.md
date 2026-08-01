# Manual Relationships

## Evidence（パス・目次対応）

### 非合成鈑桁（Phase 1 高優先）

- **MAN-001**: シリーズ目次（第1〜13章）
- **MAN-002〜014**: 各章分冊（表紙章名が MAN-001 目次と一致）
- パス: `01_コンクリート床版系鈑桁/01_非合成鈑/Grider_I_XX.pdf`

### SuperDesigner 総論

- **MAN-021**: SuperDesigner & SuperDrawing ユーザーズ・マニュアル（2002年4月）
- ルート配置。他シリーズへの入口資料候補

### 単体アプリ（Phase 1 関連）

| ID | Module | 関係 |
|---|---|---|
| MAN-060 | PcSlab | PC床版設計単体 |
| MAN-061 / MAN-062 | Section | 断面計算単体（相互版関係 UNKNOWN） |
| MAN-063 | Splice | 添接計算単体。非合成鈑桁第8章（MAN-009）と機能領域が隣接 |
| MAN-064 / MAN-065 | StDeck | 鋼床版設計・解析比較（Phase1 low） |

### その他シリーズ（Phase 1 low / 将来）

| シリーズ | 目次冊候補 | 分冊範囲 |
|---|---|---|
| 合成鈑桁 | MAN-015 | MAN-015〜020 |
| 非合成箱桁 | MAN-022 | MAN-022〜038 |
| 合成閉断面箱 | MAN-039 | 単独（目次なし・本文開始） |
| 合成開断面箱 | MAN-040 | 単独 |
| 鋼床版鈑桁 | MAN-041 | MAN-041〜051 |
| 鋼床版箱桁 | （要確認） | MAN-052〜059 |

## Interpretation

- 非合成鈑桁分冊と Section/Splice 単体は、Phase 1（非合成 RC 床版鋼鈑桁）の入力〜断面〜添接の追跡に必要度が高い。
- 箱桁・鋼床版シリーズは対照・将来対象として保持。

## Unknown

- データファイル連携（どの単体が SuperDesigner から呼ばれるか）の正式な処理順序は Stage 2。
- MAN-052〜059 の目次冊がどれかは、追加確認が必要（現 catalog の toc は分冊表紙章名ベース）。
