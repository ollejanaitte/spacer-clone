# User Search Guide: Required Curved Bridge Design Sources

## 1. How to Use This Guide

- Check `source_manifest.csv` and `repository_capability_matrix.csv` first
- Use the priority column to determine search order
- Document findings in `10_existing_source_inventory.md`

## 2. Search Targets by Priority

### P0: Search Immediately (Blocks structural model or analysis)

| # | Source | Search Keywords | Publisher Candidates | Library Candidates | Company Archive | Usefulness Check |
|---|--------|-----------------|---------------------|-------------------|-----------------|-----------------|
| 1 | 道路橋示方書 鋼橋編・共通編 | 道路橋示方書 鋼橋編 曲線桁 日本道路協会 | 日本道路協会 | 国立国会図書館, 大学図書館 | 社内設計基準書 | 曲線桁の設計規定、ねじり照査の有無 |
| 2 | 曲線橋の設計計算例 | 曲線鈑桁 設計計算例 中間値 | 日本橋梁建設協会, 土木学会 | 大学図書館, 土木学会図書館 | 社内設計計算書 | 中間値が記載されているか |
| 3 | そりねじり(Vlasov)理論 | Vlasov ねじり 曲線桁 立体骨組 | 日本鋼構造協会, 土木学会 | 大学図書館, 国立国会図書館 | 社内技術資料 | 6DOFへの拡張方法 |
| 4 | 横構二次応力 | 横構 二次応力 曲線橋 平面格子 | 日本鋼構造協会 | 大学図書館 | 社内設計マニュアル | 二次応力の算定式 |
| 5 | 遠心荷重 | 遠心荷重 曲線橋 道路橋示方書 | 日本道路協会 | 国立国会図書館 | 社内設計基準 | 活荷重との組合せ |
| 6 | 支承方向(ラジアル/タンジェンシャル) | 支承 ラジアル方向 タンジェンシャル 曲線橋 | 橋梁メーカー | - | 社内設計マニュアル | 拘束方向の定義 |
| 7 | 横桁方向(ラジアル方向) | 横桁 ラジアル方向 曲線橋 | 橋梁メーカー | - | 社内設計マニュアル | 横桁方向の決定方法 |
| 8 | キャンバー | キャンバー 曲線橋 死荷重たわみ | 日本鋼構造協会 | 大学図書館 | 社内設計計算書 | 曲線橋のキャンバー算定方法 |
| 9 | Golden検証データ | 曲線鈑桁 検証 計算例 | 土木学会, 日本鋼構造協会 | 学会論文DB | 社内検証資料 | 中間値の入手可能性 |

### P1: Search After P0 (Non-numeric MVP possible)

| # | Source | Search Keywords | Publisher Candidates |
|---|--------|-----------------|---------------------|
| 1 | 鋼橋設計便覧 | 鋼橋設計便覧 日本道路協会 | 日本道路協会 |
| 2 | 曲線橋設計計算例(日本橋梁建設協会) | 曲線橋 設計計算例 日本橋梁建設協会 鋼橋 | 日本橋梁建設協会 |
| 3 | 断面力符号規約 | 断面力 符号規約 立体骨組 部材座標 | 日本鋼構造協会 |
| 4 | 疲労詳細 | 疲労 曲線橋 鋼橋 詳細 | 日本鋼構造協会 |
| 5 | 温度荷重 | 温度荷重 曲線橋 鋼橋 | 道路協会 |

### P2: Search After P1

| # | Source | Search Keywords |
|---|--------|-----------------|
| 1 | 図面テンプレート | 曲線橋 一般図 製作図 |
| 2 | 計算書テンプレート | 計算書 曲線橋 鋼橋 |
| 3 | NEXCO基準 | NEXCO 設計基準 曲線橋 |

## 3. Search Locations

### Online Bookstores
- 丸善ジュンク堂書店: https://www.maruzenjunkudo.co.jp/
- 紀伊國屋書店: https://www.kinokuniya.co.jp/
- アマゾンジャパン: https://www.amazon.co.jp/

### Libraries
- 国立国会図書館 (NDL): https://www.ndl.go.jp/ - 蔵書検索可能
- 土木学会附属図書館
- 東京大学図書館, 東京工業大学図書館, 京都大学図書館 (一般利用可能な場合)
- 都道府県立図書館の技術書コーナー

### Publishers / Associations
- 日本道路協会: https://www.road.or.jp/ - 設計基準の発行元
- 日本橋梁建設協会: https://www.jbca.or.jp/
- 土木学会: https://www.jsce.or.jp/
- 日本鋼構造協会: https://www.jssc.or.jp/
- 国土技術政策総合研究所: https://www.nilim.go.jp/
- 土木研究所: https://www.pwri.go.jp/
- NEXCO総研: https://www.ri-nexco.co.jp/

### Company Archives
- 社内の設計計算書アーカイブ（過去の曲線橋設計実績）
- 社内の設計基準書・マニュアル
- 社内の技術資料室
- 社内の設計チェックリスト

### Vendor Documents
- 旧Apollo / Analyzerベンダー資料
- 橋梁メーカーの技術資料（横桁方向、支承方向、製作方法）
- 鋼材メーカーの技術資料

## 4. Verification Checklist for Each Source

When you find a source, verify:
1. Does it cover curved steel I-girder bridges? (not just concrete, not just straight)
2. Does it include numerical examples with intermediate values?
3. Does it specify sign conventions?
4. Does it include torsion/warping provisions?
5. Is it the latest edition? (check errata)
6. Is it applicable to the Japanese design code?

## 5. Notes

- Do **NOT** assume a book exists just because its title is mentioned here
- Record search results (found/not found) in `existing_source_inventory.md`
- If a source is found but access is restricted, note the access conditions
- If a source is not found after reasonable search, note it as **CANDIDATE** status
- Consider contacting the publishers directly for availability
- Some sources may be available as digital downloads from the publisher's website