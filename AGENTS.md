# Repository Agent Rules

## 破壊的操作の全面禁止
- `git clean` 系コマンド全般禁止（`-n` dry-run も禁止）
- `git checkout -- <file>` / `git restore <file>` / `git reset --hard` 禁止
- `git reset` / `git revert` を勝手に実行しない
- force push / `git push -f` 禁止
- リモートへの push は明示指示があった場合のみ実行可（通常はローカルコミットのみ）
- 未追跡ファイルを勝手に削除しない
- `rm` / `Remove-Item` で working tree ファイルを削除しない
  （明示指示があるファイルを除く）
- ブランチ削除禁止

## 追加ルール
- `git add .` / `git add -A` などのワイルドカード add 禁止
  （パスを明示的に指定）
- 判断がつかない状況になったら停止して報告
- 停止時はこれまでの変更を取り消さず、現状をそのまま報告
- 事前・事後の品質チェック（typecheck / test）は必ず実施

## 停止条件
以下に該当したら直ちに停止：
- 想定外のファイルが staged された
- typecheck / test が失敗した
- 依存関係が想定と異なった
- git status に想定外の変化を検知した
