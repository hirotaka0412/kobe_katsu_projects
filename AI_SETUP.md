# AI質問機能の設定・運用

## ローカル確認

Node.js 22以降、Python 3.12以降を使用します。

```powershell
python -m pip install -r requirements.txt
npm ci
Copy-Item .dev.vars.example .dev.vars
```

`.dev.vars`の`GEMINI_API_KEY`と`TURNSTILE_SECRET_KEY`を設定します。キーはチャット、公開資料、Gitへ貼り付けないでください。
Cloudflare Turnstileのウィジェットを作成し、許可ホスト名を設定します。`wrangler.jsonc`の`TURNSTILE_SITE_KEY`に公開サイトキーを設定します。
ローカルではCloudflare公式のテストキーを利用できます。テストキーを本番へ配置しないでください。

```powershell
npm run dev
```

起動したURLから資料を開きます。単純な静的HTTPサーバーやGitHub PagesではAI APIが存在しないため、資料のみ閲覧できます。
ビルドは`npm run build`を使用します。Python処理で`root`を再生成した後、チャットJSをバンドルします。生成済み`root`を直接編集しないでください。
開発サーバーの起動中にサイトを再生成した場合は、サーバーを再起動してください（生成先を作り直すため、Windowsの監視が外れる場合があります）。

## 本番公開

1. Cloudflareにログインし、対象アカウントを選択します：`npx wrangler login`。
2. `wrangler.jsonc`のWorker名を必要に応じて調整し、Turnstileの許可ホストに公開先の`workers.dev`ホスト名を登録します。
3. Secretを対話入力で登録します。

```powershell
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npm run deploy
```

公開前にTurnstileのサイトキーを設定してください。キーが未設定の場合、APIは閉じた状態になり、資料閲覧は継続できます。
初期モデルは公式モデル一覧の安定版`gemini-3.8-flash`です。利用契約での提供状況は実キーによる確認が必要です。
`GEMINI_MODEL`で明示的に変更できます。モデル切替時には日本語、PDF、EV3コード、出力長を再確認してください。

GitHub Actionsによる自動公開にはRepository Secretsの`CLOUDFLARE_API_TOKEN`（対象アカウントのWorkers編集権限）と`CLOUDFLARE_ACCOUNT_ID`を登録し、Repository Variable `WORKERS_DEPLOY_ENABLED`を`true`にします。
GeminiとTurnstileのSecretはCloudflareへ直接登録し、workflowに埋め込みません。設定前もPR・mainでビルド、型検査、テスト、デプロイdry-runを実行します。
既存のGitHub Pages workflowは維持しています。Workers移行確認まではPagesを削除しないでください。
新サイトは`workers.dev`のルートから既存と同じ資料パスを配信します。旧GitHub Pages URLはそのまま残り、自動リダイレクトは行いません。

## 制限・停止

`wrangler.jsonc`の設定：

|設定|初期値|用途|
|---|---:|---|
|AI_ENABLED|true|falseでAIを停止。資料閲覧は継続|
|QUESTION_LIMIT|2000|質問の文字数|
|SELECTION_LIMIT|4000|選択文章の文字数|
|HISTORY_TURNS|10|送信する直近の往復数|
|OUTPUT_TOKENS|2048|Geminiの生成トークン上限|
|DAILY_LIMIT|300|全体の日次受付上限。日本時間0時にリセット|
|ratelimits.simple|10/60秒|IPごとの短時間制限|

日次上限はDurable Objectの単一カウンターで予約し、Geminiが失敗した場合も回数を戻しません。金額上限ではありません。PDFや会話の長さによりトークン消費は異なります。
IP制限はCloudflareのRate Limiting bindingによる拠点単位の近似制限です。授業で同じ回線を共有する場合は値を調整してください。
資料は初期版で最大5MBまでAIに送れます。ブラウザ入力本文は512KB、会話の各メッセージは20,000文字までです。
設定変更後は再デプロイしてください。現行の上限では長い資料や会話を毎回送信するため、Google側のクォータも確認してください。

## 履歴・ログ・質問内容

会話は資料IDごとに`sessionStorage`に保持します。タブを閉じると削除され、サーバーには保存しません。タブ複製時にはブラウザの仕様により履歴が複製される場合があります。
質問、会話、選択文章、資料は回答生成のためGoogle Geminiへ送信され、Google側の取り扱いはAPI契約に従います。
Workerは完了・失敗種別、処理時間、取得できた使用トークン数を記録します。アプリのログへ質問本文、資料本文、IP、APIキーは出力しません。
コード例は表示・コピーのみです。EV3接続やコード実行機能はありません。

## 検証

```powershell
npm run build
npm run check
npm test
python -m unittest discover -s tests -p 'test_*.py'
npx wrangler deploy --dry-run
```

実APIの確認ではMarkdownとPDFをそれぞれ開き、資料説明→追加質問→EV3コード例を試します。
Gemini単体の確認には`node tools/smoke_gemini.mjs`も使用できます。`.dev.vars`または環境変数のキーを読み、公開済みの授業資料について計6回呼び出し、回答を端末へ表示します。従量課金・クォータを消費します。Turnstileやブラウザまで含めた確認は、別途画面から行ってください。
Python 3.5.3、ev3dev2、左右B/Cの指定がある資料では、その環境に合う回答か確認します。
PCの幅調整、キーボードでの幅調整、スマホ切替、添付解除、生成停止、再送、会話クリア、資料移動後の履歴を確認します。
Turnstile失敗・利用上限・通信切断・Google側の429時にも資料を読めることを確認します。

参考：[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[Geminiモデル一覧](https://ai.google.dev/gemini-api/docs/models)、[PDF入力](https://ai.google.dev/gemini-api/docs/document-processing)、[Turnstile](https://developers.cloudflare.com/turnstile/get-started/)。
