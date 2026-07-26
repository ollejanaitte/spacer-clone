# Feature Dependency Map (Stage4 candidate)

```text
[Align/線形] → 共通形状・橋面・支承配置 (Part1)
       ↓
[床版・ハンチ] (Part2) ← 横断形状
       ↓
[主桁断面・添接・補剛] (Part3) ← 主桁配置・支間
       ↓
[床組・横桁・対傾構・横構・補剛材・支承条件] (Part4)
       ↓
[荷重] → [解析データ作成] → [Analyzer実行] → [断面力変換] → [照査/たわみ] (Part5)
       ↓
[計算書RTF / 照査リスト] (Part6)
[製図入力生成 → 設計変換 → 全部材 → GSP/DWG] (Part6)
[鋼重 → 仮定鋼重反映] (Part6→Part5 loop)
[NPDATA → y-Mater] (Part6)
```

Upstream/downstream columns in CSV remain mostly NONE; this map is Interpretation from Part summaries + MAN-021/002 flow.
