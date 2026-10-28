# 神戸活資料閲覧HP 管理手順

このリポジトリは、`0705` や `0802` のような日付フォルダに入れた授業資料を、Cloudflare WorkersとGitHub Pagesで配信できる静的サイトに変換します。

## 基本の運用

1. 資料を使った日付のフォルダを作成します。
   - 例: `0705`, `0802`, `0913`
   - フォルダ名は半角数字4桁にします。
2. そのフォルダの中に資料を入れます。
   - 対応形式: `.md`, `.pdf`
   - Markdownはサイト内のHTMLページに変換されます。
   - PDFはプレビュー用ページとダウンロードリンクが作られます。
3. ローカルで確認する場合は、リポジトリ直下で次を実行します。

```powershell
npm run build
```

4. `npm run dev`で開発サーバーを起動し、表示されたURLで確認します。資料だけなら `root/index.html` をブラウザで開いて確認できます。

## 公開の流れ

GitHub Pagesへの公開は、`.github/workflows/pages.yml` のGitHub Actionsで行います。

1. GitHubリポジトリのPages設定で、公開元を `GitHub Actions` にします。
2. 変更を `main` ブランチへpushします。
3. GitHub Actionsが自動で次を実行します。
   - Pythonをセットアップ
   - `markdown` パッケージをインストール
   - `npm ci` でNode.js依存を取得し、`npm run build` で `root` を生成
   - `root` をGitHub Pagesへデプロイ

手動で再公開したい場合は、GitHub Actionsの `Deploy site to Pages` workflowを `workflow_dispatch` で実行できます。

## トップページの説明文

トップページのタイトルと説明文は、`README.md` の冒頭から取得します。

- 最初の見出しがサイトタイトルになります。
- 見出しの後の本文がトップページの説明文になります。
- 資料一覧そのものは日付フォルダから自動生成されます。

## 表示順とファイル名

- 日付フォルダは新しい順に表示されます。
- 同じ日付フォルダ内の資料はファイル名順に表示されます。
- 資料タイトルは拡張子を除いたファイル名から作られます。
- 日本語ファイル名も使用できます。

## 追加時の確認チェック

資料を追加したら、最低限次を確認します。

```powershell
npm run build
```

- `root/index.html` に新しい日付と資料が出ていること
- Markdownが文字化けしていないこと
- PDFの閲覧ボタンとダウンロードボタンが開けること

## 注意点

- `root` は自動生成物です。通常は直接編集しません。
- デザインや生成ルールを変える場合は `tools/build_site.py` と `web/` を編集します。
- MarkdownファイルはUTF-8で保存してください。
- 日付フォルダ以外の場所に置いた資料は、サイトには表示されません。
- 対応外の形式を掲載したい場合は、`tools/buildroot.py` に処理を追加します。


## AI質問機能

Cloudflare Workers・Geminiの設定と公開手順は [AI_SETUP.md](AI_SETUP.md) を参照してください。
