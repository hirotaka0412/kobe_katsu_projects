// Handles arbitrary UTF-8/network chunk boundaries and CRLF SSE frames.
export async function* events(stream: ReadableStream<Uint8Array>): AsyncGenerator<{event:string; data:string}> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  const parse = (frame:string) => ({event: frame.split('\n').find(l=>l.startsWith('event:'))?.slice(6).trim() || 'message', data:frame.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n')});
  try {
    for (;;) {
      const {value,done} = await reader.read();
      if (value) buffer += value;
      buffer = buffer.replace(/\r\n/g,'\n');
      let end:number;
      while ((end=buffer.indexOf('\n\n')) >= 0) {
        const frame=buffer.slice(0,end); buffer=buffer.slice(end+2);
        if(frame) yield parse(frame);
      }
      if(done) { if(buffer.trim()) yield parse(buffer); break; }
    }
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
