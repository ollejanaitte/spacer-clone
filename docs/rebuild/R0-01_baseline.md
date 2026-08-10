================================================================================
R0-01  正規baseline記録
================================================================================
Phase R0 開始時に実測した正規baselineの記録。

監査日: 2026-08-10

--------------------------------------------------------------------------------
1. Canonical repo / branch
--------------------------------------------------------------------------------
- Canonical repo : /home/masaharu/Projects/spacer-clone
- Canonical branch: main
- Remote        : origin = https://github.com/ollejanaitte/spacer-clone.git
- 正規baseline SHA: 42448712c44868855a247b6b947c3e446473fecd
- origin/main SHA: 42448712c44868855a247b6b947c3e446473fecd
- local main == origin/main（差分なし）

--------------------------------------------------------------------------------
2. git status（開始時）
--------------------------------------------------------------------------------
main worktree には以下の dirty 変更が存在（既存作業として保護）。

- M docs/apollo/step4c_appurtenance_haunch/evidence/load.json
      inputRevision/generatedAt のタイムスタンプ更新（再生成成果物）
- M docs/apollo/step4c_appurtenance_haunch/evidence/quantity.json
      同上
- M docs/apollo/step4c_appurtenance_haunch/evidence/stl-metadata.json
      digest 更新
- D final_report.txt
      2500行の報告書ファイルがローカルで削除済み

→ これらは Phase R0 以前から存在する既存変更。削除・reset・checkout・stash・
  上書きは行わない。所有・扱いはユーザー判断事項。

- git stash list : 空
- untracked      : 監査対象外の local-archive / local-reference / .venv 等（gitignore）

--------------------------------------------------------------------------------
3. worktree 一覧（Phase R0 開始時）
--------------------------------------------------------------------------------
- /home/masaharu/Projects/spacer-clone    4244871 [main]（旧システム・安定版）
- 多数の /tmp/opencode/* worktree（過去のフェーズ・監査用。main と独立）

--------------------------------------------------------------------------------
4. runtime 環境
--------------------------------------------------------------------------------
- Node.js : v22.23.2 / npm 10.9.8
- Python  : 3.10.12（.venv 使用）
- gh CLI  : 2.4.0（GitHub 認証: ollejanaitte）
- Electron: ^42.3.3（frontend devDependencies）
- DISPLAY : :0（Electron 起動可能）

--------------------------------------------------------------------------------
5. 旧システムの起動方法（参考・変更しない）
--------------------------------------------------------------------------------
./start-ubuntu.sh（既定: Apollo Phase1-NN + Electron + compat-gpu-blocklist）
backend: 127.0.0.1:8000 / vite: 127.0.0.1:5173

--------------------------------------------------------------------------------
6. 位置づけ
--------------------------------------------------------------------------------
本 SHA (4244871) は Phase R0 の正規baselineであり、
rebuild/integrated-system の作成元。旧システムの保全基準。
