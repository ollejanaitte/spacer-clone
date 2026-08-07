# X0_SOURCE_ROOTS — 情報源ルート定義

Phase X0 で棚卸しする情報源のルートとアクセスポリシー。

| source_root | 絶対パス | 内容 | アクセスポリシー |
| --- | --- | --- | --- |
| SR-01 | ~/Projects | 道路構造令・サンプル道路資料・鋼橋サンプル・Apollo UI指示書の正本置場 | 読み取りのみ。リポジトリ外 |
| SR-02 | ~/Projects/liner-future-research | LINER R1調査のソース複製（manuals/design_examples/repositoryスナップショット）と調査成果物 | 読み取りのみ |
| SR-03 | ~/Projects/spacer-clone-liner-r1-planning | LINER専用worktree（マニュアル・サンプル・level2データ・研究成果物） | Phase X0の作業場。成果物配置先 |
| SR-04 | ~/Projects/spacer-clone | 上部工・main系worktree。マニュアル・設計基準PDF・APOLLOマニュアル・研究アーカイブ | 読み取り専用。**絶対に変更しない** |
| SR-05 | ~/Projects/Scope_of_Work | 曲線橋ソース調査（step10_curved_bridge）等の研究成果物 | 読み取りのみ |
| SR-06 | ~/Projects/substructure-planning-lab | 下部工計画の研究成果物 | 読み取りのみ |

## 除外ポリシー

- `~/Projects/spacer-clone` は原則読み取り専用。Phase X0の成果物は必ず SR-03 側にのみ作成する。
- リポジトリ外の PDF 原本（道路構造令・道示・サンプル等）は Git に含めない。
- `legacy-archive` 内の node_modules・zip 等の依存物は資産台帳の対象外。
- 対象外ファイルは `DOCUMENT_INVENTORY.csv` に含めず、ここにて除外方針として明記する。

## 除外された既知ファイル（対象外の理由）

| パス | 理由 |
| --- | --- |
| ~/Projects/スペーサークローンの古いもの_spacer-clone-old.zip | レガシーアーカイブのZIP。文書資産ではない |
| ~/Projects/OpenRouter_DeepSeekFlashのトークンコード | 秘密情報。資産対象外 |
| ~/Projects/spacer-clone/local-archive/legacy-archive/** | 依存物（node_modules等）を含むレガシーアーカイブ |
| 各リポジトリの node_modules / dist / build / .venv / __pycache__ / .cache / .git | 生成物・仮想環境 |
