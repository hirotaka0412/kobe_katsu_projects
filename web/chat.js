import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {events} from '../worker/sse.ts';

const $=id=>document.getElementById(id);
const workspace=document.querySelector('.workspace');
const key=`kobe-chat-v1:${workspace.dataset.documentId}`;
let history=[],selection='',config,widget,controller,lastRequest,ready=false;
try { const stored=JSON.parse(sessionStorage.getItem(key)||'[]'); if(Array.isArray(stored)) history=stored.filter(m=>m && ['user','model'].includes(m.role) && typeof m.text==='string').slice(-20); if(history.length%2)history=[]; } catch{}
const status=text=>$('chat-status').textContent=text;
const save=()=>{try{sessionStorage.setItem(key,JSON.stringify(history));}catch{status('この端末では履歴を保持できません。');}};
function message(role,text) {
  const node=document.createElement('section');node.className=`message ${role}`;
  const label=document.createElement('span');label.className='message-label';label.textContent=role==='user'?'あなた':'AI';node.append(label);
  const body=document.createElement('div');node.append(body);$('messages').append(node);
  updateMessage(body,role,text);return body;
}
function updateMessage(body,role,text) {
  if(role==='user') body.textContent=text;
  else {
    body.innerHTML=DOMPurify.sanitize(marked.parse(text,{breaks:true}),{USE_PROFILES:{html:true},FORBID_TAGS:['img','style','input','form','button']});
    body.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
    body.querySelectorAll('pre').forEach(pre=>{
      const code=pre.querySelector('code'); if(!code)return;
      const copy=document.createElement('button');copy.type='button';copy.textContent='コピー';
      copy.onclick=async()=>{try{await navigator.clipboard.writeText(code.textContent);copy.textContent='コピーしました';}catch{copy.textContent='コピーできませんでした';}};pre.prepend(copy);
    });
  }
}
history.forEach(m=>message(m.role,m.text));
function opened(open) {workspace.classList.toggle('chat-closed',!open);document.querySelector('.chat-toggle').setAttribute('aria-expanded',String(open));if(open)$('question').focus();else document.querySelector('.chat-toggle').focus();}
if(matchMedia('(max-width:800px)').matches) workspace.classList.add('chat-closed');
document.querySelector('.chat-toggle').setAttribute('aria-expanded',String(!workspace.classList.contains('chat-closed')));
document.querySelector('.chat-toggle').onclick=()=>opened(true);$('close-chat').onclick=()=>opened(false);
$('clear-chat').onclick=()=>{if(controller)controller.abort();history=[];lastRequest=null;save();$('messages').replaceChildren();$('retry-chat').hidden=true;status('新しい会話を開始しました。');};
function attach(text) {selection=text.slice(0,config?.selectionLimit||4000);$('selection-preview').textContent=selection;$('selection-box').hidden=!selection;}
let savedSelection='';
document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(s?.rangeCount && document.querySelector('.markdown-body')?.contains(s.anchorNode) && document.querySelector('.markdown-body')?.contains(s.focusNode))savedSelection=s.toString();});
$('attach-selection')?.addEventListener('click',()=>{attach(savedSelection);opened(true);});
$('remove-selection').onclick=()=>attach('');
const handle=document.querySelector('.resize-handle');
function resize(width) {width=Math.min(700,Math.max(300,Math.min(innerWidth-320,width)));workspace.style.setProperty('--chat-width',`${width}px`);handle.setAttribute('aria-valuenow',String(Math.round(width)));}
handle.onpointerdown=e=>{handle.setPointerCapture(e.pointerId);workspace.classList.add('resizing');};
handle.onpointermove=e=>{if(handle.hasPointerCapture(e.pointerId))resize(innerWidth-e.clientX);};
handle.onpointerup=handle.onpointercancel=()=>workspace.classList.remove('resizing');
handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(Number(handle.getAttribute('aria-valuenow'))+(e.key==='ArrowLeft'?20:-20));}};
function controls(busy) {$('send-chat').disabled=busy||!ready;$('stop-chat').disabled=!busy;$('question').disabled=busy;$('retry-chat').disabled=busy||!ready;$('clear-chat').disabled=busy;}
$('stop-chat').onclick=()=>controller?.abort();
$('question').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('chat-form').requestSubmit();}};
async function send(payload) {
  if(!ready||controller)return;
  const token=window.turnstile?.getResponse(widget);
  if(!token){status('認証の完了を待ってから送信してください。');return;}
  controller=new AbortController();controls(true);$('retry-chat').hidden=true;lastRequest=payload;
  message('user',payload.question+(payload.selection?`\n\n添付: ${payload.selection}`:''));
  const answer=message('model','');let text='',complete=false;
  status('回答を生成しています…');
  try {
    const response=await fetch(new URL('/api/chat',location.origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,turnstileToken:token}),signal:controller.signal});
    if(!response.ok) {const error=await response.json();throw new Error(error.error||'送信に失敗しました。');}
    if(!response.body)throw new Error('回答を受信できませんでした。');
    for await(const event of events(response.body)) {
      const data=JSON.parse(event.data);
      if(event.event==='delta') {text+=data.text;updateMessage(answer,'model',text);$('messages').scrollTop=$('messages').scrollHeight;}
      if(event.event==='error')throw new Error(data.error);
      if(event.event==='done'){complete=true;status(data.truncated?'回答は長さの上限で終了しました。続きは追加で質問できます。':'回答が完了しました。');}
    }
    if(!complete)throw new Error('通信が中断されました。再送してください。');
    history=[...payload.history,{role:'user',text:payload.question+(payload.selection?`\n選択文章:\n${payload.selection}`:'')},{role:'model',text}].slice(-(config.historyTurns*2));save();
    $('question').value='';attach('');lastRequest=null;
  } catch(error) {status(error.name==='AbortError'?'生成を停止しました。必要に応じて再送してください。':error.message);$('retry-chat').hidden=false;}
  finally {controller=null;ready=false;window.turnstile?.reset(widget);controls(false);}
}
$('chat-form').onsubmit=e=>{e.preventDefault();if(!config||!ready)return;send({documentId:workspace.dataset.documentId,question:$('question').value,selection,history:history.slice(-(config.historyTurns*2))});};
$('retry-chat').onclick=()=>{if(lastRequest)send(lastRequest);};
async function init() {
  try {
    const response=await fetch('/api/config');if(!response.ok)throw new Error();config=await response.json();
    $('question').maxLength=config.questionLimit;
    if(!config.enabled){status('AI質問機能は現在利用できません。資料はそのまま閲覧できます。');return;}
    window.kobeTurnstileReady=()=>{
      widget=window.turnstile.render('#turnstile',{sitekey:config.siteKey,action:'chat',callback:()=>{ready=true;controls(!!controller);if(!lastRequest&&!history.length)status('質問を入力してください。');},'expired-callback':()=>{ready=false;controls(!!controller);},'error-callback':()=>{ready=false;controls(!!controller);status('認証に失敗しました。ネットワークを確認して再読み込みしてください。');}});
    };
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=kobeTurnstileReady&render=explicit';script.async=true;script.onerror=()=>status('認証を読み込めませんでした。資料は引き続き閲覧できます。');document.head.append(script);
  } catch {status('AIに接続できません。資料はそのまま閲覧できます。');}
}
init();
