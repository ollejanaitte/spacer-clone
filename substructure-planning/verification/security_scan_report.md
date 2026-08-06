# Phase A: セキュリティスキャン報告 (security_scan_report)

日時: 2026-08-07 (JST)
対象ラボ: /home/masaharu/Projects/substructure-planning-lab

## 1. 目的
統合対象に秘密情報・個人情報・資格情報が含まれないことを、実際のファイルをスキャンして確認する。

## 2. スキャン項目(exclude: node_modules / dist)
| カテゴリ | パターン | 検出 |
|---|---|---|
| APIキー / トークン | api_key, secret, token, ghp_, github_pat_, sk-, AKIA | なし(文書上の禁則言及のみ(*)) |
| 秘密鍵 | BEGIN RSA/OPENSSH/EC/PRIVATE, id_rsa, .ssh | なし |
| 認証情報 | password, passwd, credential, Bearer | 言及のみ(*) |
| 個人情報(メール/電話/IP) | メール・10桁数字・IP(座標系/127.0.0.1 を除外) | なし |
| デプロイ資格情報(実値) | resolver に認証トークン等実際の値 | なし |

(*) preflight_report.txt:104 と final_report.txt の「deploy key / token / credential の変更禁止」は、
タスク要件(禁止規定)を文書化したもので、実資格情報の検出ではない。値の一致 なし。

## 3. GitHub リモートとの関連
- remote URL `https://github.com/ollejanaitte/spacer-clone.git` が metadata に 2 件存在(init 記録由来)。
  これは秘密情報ではなくパブリックリポジトリの URI であり、スキャン対象外で問題なし。

## 4. 結論
SECURITY_SCAN_VERDICT = **PASS**(実資格情報・秘密・PII を検出せず)