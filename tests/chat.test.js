import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {afterEach,expect,it,vi} from 'vitest';

const html=readFileSync('root/0802/ev3_python_ai.html','utf8');
const script=readFileSync('root/assets/chat.js','utf8');
let dom;
afterEach(()=>dom?.window.close());
async function setup({mobile=false,enabled=true,stored=null,reply='回答です。',url='https://example.com/0802/ev3_python_ai.html'}={}) {
  dom=new JSDOM(html,{url,runScripts:'outside-only'});
  const w=dom.window;
  w.matchMedia=()=>({matches:mobile});w.TextDecoderStream=TextDecoderStream;
  let callback;
  w.turnstile={render:(_target,opts)=>{callback=opts.callback;return 'widget';},getResponse:()=> 'token',reset:()=>{}};
  w.fetch=vi.fn(async url=>String(url).endsWith('/api/config')?Response.json({enabled,siteKey:'public',questionLimit:2000,selectionLimit:4000,historyTurns:10}):new Response(`event: delta\ndata: ${JSON.stringify({text:reply})}\n\nevent: done\ndata: {}\n\n`));
  const key=`kobe-chat-v1:${w.document.querySelector('.workspace').dataset.documentId}`;
  if(stored)w.sessionStorage.setItem(key,JSON.stringify(stored));
  w.eval(script);
  await vi.waitFor(()=>{if(enabled)expect(w.kobeTurnstileReady).toBeTypeOf('function');else expect(w.document.querySelector('#chat-status').textContent).toContain('現在利用できません');});
  if(enabled){w.kobeTurnstileReady();callback();}
  return {w,key,$:id=>w.document.getElementById(id)};
}
it('keeps material readable when AI is unavailable',async()=>{
  const {$}=await setup({enabled:false});expect($('send-chat').disabled).toBe(true);expect(dom.window.document.querySelector('.markdown-body').textContent).toContain('Python');
});
it('switches mobile panes and supports keyboard resizing',async()=>{
  const {w,$}=await setup({mobile:true});const workspace=w.document.querySelector('.workspace');
  expect(workspace.classList.contains('chat-closed')).toBe(true);
  w.document.querySelector('.chat-toggle').click();expect(workspace.classList.contains('chat-closed')).toBe(false);
  $('close-chat').click();expect(workspace.classList.contains('chat-closed')).toBe(true);
  const handle=w.document.querySelector('.resize-handle');handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));expect(handle.getAttribute('aria-valuenow')).toBe('420');
});
it('sanitizes dangerous model HTML, retains code and stores only complete replies',async()=>{
  const {w,$,key}=await setup({reply:'<script>alert(1)</script><img src=x onerror=alert(1)>[bad](javascript:alert(1))\n\n```python\nprint("ok")\n```'});
  $('question').value='コードを説明して';$('chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await vi.waitFor(()=>expect($('chat-status').textContent).toContain('完了'));
  const message=w.document.querySelector('.message.model');expect(message.querySelector('script,img,[onerror],a[href^="javascript:"]')).toBeNull();expect(message.querySelector('code').textContent).toContain('print');expect(message.querySelector('button').textContent).toBe('コピー');
  expect(JSON.parse(w.sessionStorage.getItem(key))).toHaveLength(2);
  $('clear-chat').click();expect(JSON.parse(w.sessionStorage.getItem(key))).toEqual([]);expect($('messages').childElementCount).toBe(0);
});
it('restores document history and allows retry after connection failure',async()=>{
  const {w,$}=await setup({stored:[{role:'user',text:'前の質問'},{role:'model',text:'前の回答'}]});
  expect($('messages').textContent).toContain('前の回答');
  w.fetch.mockImplementationOnce(async()=>Response.json({error:'AIが混雑しています。'},{status:429}));
  $('question').value='追加の質問';$('chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await vi.waitFor(()=>expect($('chat-status').textContent).toContain('混雑'));
  expect($('retry-chat').hidden).toBe(false);expect($('question').value).toBe('追加の質問');
});
it('stops an active request without storing a partial conversation',async()=>{
  const {w,$,key}=await setup();
  w.fetch.mockImplementationOnce(async(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new w.DOMException('Aborted','AbortError')))));
  $('question').value='質問';$('chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  expect($('stop-chat').disabled).toBe(false);$('stop-chat').click();
  await vi.waitFor(()=>expect($('chat-status').textContent).toContain('停止'));
  expect(w.sessionStorage.getItem(key)).toBeNull();expect($('retry-chat').hidden).toBe(false);
});

it.each([
  ['https://hirotaka0412.github.io/kobe_katsu_projects/0802/ev3_python_ai.html','https://kobe-katsu-projects.2315097t.workers.dev'],
  ['https://kobe-katsu-projects.2315097t.workers.dev/0802/ev3_python_ai.html','https://kobe-katsu-projects.2315097t.workers.dev'],
  ['http://127.0.0.1:8787/0802/ev3_python_ai.html','http://127.0.0.1:8787']
])('routes config and chat correctly from %s',async(url,api)=>{
  const {w,$}=await setup({url});
  expect(String(w.fetch.mock.calls[0][0])).toBe(api+'/api/config');
  $('question').value='資料を説明して';$('chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await vi.waitFor(()=>expect($('chat-status').textContent).toContain('完了'));
  expect(String(w.fetch.mock.calls[1][0])).toBe(api+'/api/chat');
  expect(w.fetch.mock.calls[1][1].credentials).toBe('omit');
});
