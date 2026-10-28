// Opt-in live test: six Gemini requests using only the repository's public lesson material.
import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const local=existsSync(path.join(root,'.dev.vars'))?parseEnv(readFileSync(path.join(root,'.dev.vars'),'utf8')):{};
const key=process.env.GEMINI_API_KEY||local.GEMINI_API_KEY;
const config=JSON.parse(readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
const model=process.env.GEMINI_MODEL||local.GEMINI_MODEL||config.vars.GEMINI_MODEL;
if(!key){console.error('GEMINI_API_KEYを環境変数または.dev.varsに設定してください。キーは表示しません。');process.exit(1);}
const manifest=JSON.parse(readFileSync(path.join(root,'root/assets/documents.json'),'utf8'));
const selected=[manifest.find(d=>d.kind==='Markdown'&&d.title==='EV3_Python_AI向け説明書'),manifest.find(d=>d.kind==='PDF'&&d.title==='EV3をPythonで動かす')];
for(const doc of selected){
  if(!doc)throw new Error('テスト用資料がありません。npm run buildを実行してください。');
  const bytes=readFileSync(path.join(root,'root',decodeURIComponent(doc.path)));
  const part=doc.kind==='PDF'?{inlineData:{mimeType:'application/pdf',data:bytes.toString('base64')}}:{text:bytes.toString('utf8')};
  const contents=[{role:'user',parts:[{text:`資料「${doc.title}」を読み、以降の質問に日本語で答えてください。資料の記述と一般的な補足を区別し、根拠となる見出しかPDFページを示してください。資料にあるPython・ライブラリ・ポート設定を守ってください。`},part]}];
  for(const question of ['この資料の目的と動作環境を説明してください。','その環境で実行する際の注意点は何ですか？','左右のモーターでゆっくり1秒前進し、必ず停止するEV3のPythonコード例を示してください。']){
    // The first question shares the document turn; later questions are ordinary follow-ups.
    if(contents.length===1)contents[0].parts.push({text:question});else contents.push({role:'user',parts:[{text:question}]});
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents,generationConfig:{maxOutputTokens:2048}}),signal:AbortSignal.timeout(90_000)});
    if(!response.ok)throw new Error(`Gemini HTTP ${response.status} (${model})。Google側のモデル利用権限・クォータを確認してください。`);
    const body=await response.json();const answer=(body.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
    if(!answer)throw new Error('Geminiから表示可能な回答がありませんでした。');
    console.log(`\n[${doc.kind}] ${doc.title}\nQ: ${question}\n${answer}\n使用トークン: ${body.usageMetadata?.totalTokenCount??'不明'}`);
    contents.push({role:'model',parts:[{text:answer}]});
  }
}
