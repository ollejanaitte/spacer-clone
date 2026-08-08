# X3_IMPLEMENTATION_INPUT — X3実装Input

## 実装対象（X3 P0）

| Order | Rule | Module | Description |
|-------|------|--------|-------------|
| 1 | X2-R-001 | LINER/INPUT | 道路区分決定 |
| 2 | X2-R-002 | LINER/INPUT | 設計速度決定 |
| 3 | X2-R-003 | LINER/INPUT | 設計車両諸元 |
| 4 | X2-R-004 | LINER/CROSS-SECTION | 車線幅員決定 |
| 5 | X2-R-005 | LINER/CROSS-SECTION | 中央帯幅員決定 |
| 6 | X2-R-006 | LINER/CROSS-SECTION | 路肩幅員決定 |
| 7 | X2-R-007 | LINER/ALIGNMENT | 最小曲線半径照査 |
| 8 | X2-R-008 | LINER/ALIGNMENT | 緩和区間・クロソイド |
| 9 | X2-R-009 | LINER/ALIGNMENT | 片勾配設定 |
| 10 | X2-R-011 | LINER/ALIGNMENT | 縦断勾配照査 |
| 11 | X2-R-012 | LINER/ALIGNMENT | 縦断曲線設定 |
| 12 | X2-R-013 | LINER/CROSS-SECTION | 横断勾配設定 |

## X3実装前確認事項
- 各RuleのJSON Schemaに従い実装
- TABLE_LOOKUPの値はRULE_REGISTRYのsource_evidence_idsから抽出
- 実案件PROJECT_REPLAYテストで検証
