import { describe,it,expect,vi,afterEach } from 'vitest';
import worker,{validate,DailyQuota,type Env} from '../worker/index';
import {events} from '../worker/sse';

const env=()=>({AI_ENABLED:'true',GEMINI_API_KEY:'test-secret',TURNSTILE_SECRET_KEY:'test-secret',TURNSTILE_SITE_KEY:'public',GEMINI_MODEL:'gemini-3.8-flash',QUESTION_LIMIT:'2000',SELECTION_LIMIT:'4000',HISTORY_TURNS:'10',OUTPUT_TOKENS:'2048',DAILY_LIMIT:'300',CHAT_RATE:{limit:vi.fn(async()=>({success:true}))},DAILY_QUOTA:{idFromName:()=>1,get:()=>({fetch:async()=>Response.json({allowed:true})})},ASSETS:{fetch:vi.fn(async(request:Request)=> new URL(request.url).pathname.endsWith('documents.json')?Response.json([{id:'doc',title:'EV3',kind:'Markdown',path:'/test.md'}]):new Response('Python 3.5.3; OUTPUT_B; OUTPUT_C'))}} as unknown as Env);
const input=()=>({documentId:'doc',question:'説明して',selection:'',history:[],turnstileToken:'test'});
const request=(body:unknown=input(),origin='https://example.com')=>new Request('https://example.com/api/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'1.2.3.4'},body:JSON.stringify(body)});
afterEach(()=>vi.unstubAllGlobals());
describe('validation and protection',()=>{
  it('validates limits and paired roles',()=>{
    expect(validate(input(),env()).question).toBe('説明して');
    for(const change of [{question:'a'.repeat(2001)},{selection:'a'.repeat(4001)},{history:[{role:'model',text:'x'}]},{history:[{role:'user',text:'x'}]},{question:''}])expect(()=>validate({...input(),...change},env())).toThrow();
  });
  it('rejects cross-origin and disabled configuration',async()=>{
    expect((await worker.fetch(request(input(),'https://evil.com'),env())).status).toBe(403);
    expect((await worker.fetch(request(),{...env(),AI_ENABLED:'false'})).status).toBe(503);
  });
  it('rejects oversized input and missing documents before Gemini',async()=>{
    expect((await worker.fetch(request({...input(),question:'a'.repeat(520000)}),env())).status).toBe(413);
    expect((await worker.fetch(request({...input(),documentId:'https://evil.com'}),env())).status).toBe(404);
  });
  it('enforces IP and global limits',async()=>{
    const e=env();e.CHAT_RATE.limit=async()=>({success:false});
    expect((await worker.fetch(request(),e)).status).toBe(429);
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({success:true,hostname:'example.com',action:'chat'})));
    const q=env();q.DAILY_QUOTA={idFromName:()=>1,get:()=>({fetch:async()=>Response.json({allowed:false})})} as unknown as DurableObjectNamespace;
    expect((await worker.fetch(request(),q)).status).toBe(429);
  });
  it('rejects invalid Turnstile tokens, hosts and actions',async()=>{
    for(const value of [{success:false},{success:true,hostname:'evil.com',action:'chat'},{success:true,hostname:'example.com',action:'other'}]){
      vi.stubGlobal('fetch',vi.fn(async()=>Response.json(value)));
      expect((await worker.fetch(request(),env())).status).toBe(403);
    }
  });
});
describe('SSE and Gemini',()=>{
  it('parses byte-by-byte Japanese with CRLF and multiline data',async()=>{
    const bytes=new TextEncoder().encode('event: delta\r\ndata: 日本語\r\ndata: 続き\r\n\r\nevent: done\ndata: {}\n\n');
    const stream=new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}});
    const output=[];for await(const event of events(stream))output.push(event);
    expect(output).toEqual([{event:'delta',data:'日本語\n続き'},{event:'done',data:'{}'}]);
  });
  it.each(['Markdown','PDF'])('streams %s with trusted material and hides API key',async kind=>{
    const e=env();e.ASSETS.fetch=vi.fn(async(r:Request)=>new URL(r.url).pathname.endsWith('documents.json')?Response.json([{id:'doc',title:'EV3',kind,path:'/test'}]):new Response('material'));
    const fetcher=vi.fn(async(url:string,options:RequestInit)=>{
      if(url.includes('siteverify'))return Response.json({success:true,hostname:'example.com',action:'chat'});
      const body=JSON.parse(options.body as string);
      expect(body.generationConfig.maxOutputTokens).toBe(2048);
      expect(JSON.stringify(body)).toContain(kind==='PDF'?'application/pdf':'material');
      return new Response('data: {"candidates":[{"content":{"parts":[{"text":"説明"}]},"finishReason":"STOP"}],"usageMetadata":{"totalTokenCount":10}}\n\n');
    });vi.stubGlobal('fetch',fetcher);
    const result=await worker.fetch(request(),e);const output=await result.text();
    expect(output).toContain('event: delta');expect(output).toContain('event: done');expect(output).not.toContain('test-secret');
  });
  it('handles provider rate limits and interrupted output',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.includes('siteverify')?Response.json({success:true,hostname:'example.com',action:'chat'}):new Response('',{status:429})));
    expect((await worker.fetch(request(),env())).status).toBe(429);
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.includes('siteverify')?Response.json({success:true,hostname:'example.com',action:'chat'}):new Response('data: {"candidates":[{"finishReason":"SAFETY"}]}\n\n')));
    expect(await (await worker.fetch(request(),env())).text()).toContain('event: error');
  });
});
describe('daily quota',()=>{
  it('allows the limit, rejects excess and resets at midnight JST',async()=>{
    const map=new Map();const storage={get:async(k:string)=>map.get(k),put:async(k:string,v:unknown)=>{map.set(k,v);},transaction:async(fn:Function)=>fn(storage)};
    const quota=new DailyQuota({storage} as unknown as DurableObjectState);
    const reserve=async()=> (await (await quota.fetch(new Request('https://quota',{method:'POST',body:JSON.stringify({limit:2})}))).json()) as {allowed:boolean};
    const now=vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-28T14:59:59Z'));
    expect((await reserve()).allowed).toBe(true);expect((await reserve()).allowed).toBe(true);expect((await reserve()).allowed).toBe(false);
    now.mockReturnValue(Date.parse('2026-10-28T15:00:00Z'));expect((await reserve()).allowed).toBe(true);now.mockRestore();
  });
});

describe('GitHub Pages cross-origin API',()=>{
  const origin='https://hirotaka0412.github.io';
  const configured=()=>({...env(),ALLOWED_ORIGINS:origin});
  const preflight=(caller=origin,method='POST',headers='content-type')=>new Request('https://example.com/api/chat',{method:'OPTIONS',headers:{Origin:caller,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers}});
  it('answers preflight without consuming quota or calling providers',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const e=configured();
    const response=await worker.fetch(preflight(),e);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(response.headers.get('Vary')).toBe('Origin');
    expect(e.CHAT_RATE.limit).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects unapproved origins, methods, headers and opaque origins',async()=>{
    for(const req of [preflight('https://evil.com'),preflight('https://hirotaka0412.github.io.evil.com'),preflight('null'),preflight(origin,'DELETE'),preflight(origin,'POST','authorization')])expect((await worker.fetch(req,configured())).status).toBe(403);
    const response=await worker.fetch(request(input(),'https://evil.com'),configured());
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
    const missing=request();missing.headers.delete('Origin');expect((await worker.fetch(missing,configured())).status).toBe(403);
  });
  it('adds CORS to configuration, validation failures and internal errors',async()=>{
    const e=configured();
    const config=await worker.fetch(new Request('https://example.com/api/config',{headers:{Origin:origin}}),e);
    expect(config.status).toBe(200);expect(config.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    const invalid=await worker.fetch(request({...input(),question:''},origin),e);
    expect(invalid.status).toBe(400);expect(invalid.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    e.ASSETS.fetch=async()=>{throw new Error('unavailable');};
    const failed=await worker.fetch(request(input(),origin),e);
    expect(failed.status).toBe(503);expect(failed.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });
  it('binds Turnstile hostname to the page origin and returns SSE with CORS',async()=>{
    const fetcher=vi.fn(async(url:string)=>url.includes('siteverify')?Response.json({success:true,hostname:'hirotaka0412.github.io',action:'chat'}):new Response('data: {"candidates":[{"content":{"parts":[{"text":"回答"}]},"finishReason":"STOP"}]}\n\n'));
    vi.stubGlobal('fetch',fetcher);
    const response=await worker.fetch(request(input(),origin),configured());
    expect(response.status).toBe(200);expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');expect(await response.text()).toContain('event: done');
    fetcher.mockImplementation(async()=>Response.json({success:true,hostname:'example.com',action:'chat'}));
    const mismatch=await worker.fetch(request(input(),origin),configured());
    expect(mismatch.status).toBe(403);expect(mismatch.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });
});
