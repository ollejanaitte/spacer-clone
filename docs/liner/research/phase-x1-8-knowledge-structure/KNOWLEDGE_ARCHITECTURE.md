# KNOWLEDGE_ARCHITECTURE — 知識アーキテクチャ

## 5コンポーネント構成

```
+------------------+     +------------------+     +------------------+
|  Knowledge Base  |────▶|   Rule Engine    |────▶|  Validation /    |
|  (Entity/Relation) |    |  (要求値の出力)   |    |  Warning/Error    |
+------------------+     +------------------+     +------------------+
        │                        │
        │                        ▼
        │                 +------------------+
        │                 | Geometry Engine  |
        │                 | (幾何計算)        |
        │                 +------------------+
        │                        │
        ▼                        ▼
+------------------+     +------------------+
|  Road→Bridge     |────▶|  Drawing / Report|
|  Interface       |     |  Engine          |
+------------------+     +------------------+
```

## 責務

| コンポーネント | 責務 | 非責務 |
|--------------|------|--------|
| Knowledge Base | Entity定義・Relation定義・Provenance管理 | 計算・Validation |
| Rule Engine | 条件評価・制約値出力・例外解決 | 幾何計算・図面生成 |
| Geometry Engine | 線形座標計算・測点算出・座標変換 | 基準値照査・図面 |
| Drawing/Report Engine | 図面生成・帳票出力 | 計算・照査 |
| Road→Bridge Interface | 道路→橋梁の値伝達 | 構造設計 |
