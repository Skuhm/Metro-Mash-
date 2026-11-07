// A strict little MQTT 3.1.1 broker over WebSocket, for testing phone sync without the internet.
const http=require('http');const {WebSocketServer}=require('/opt/npm-tools/node_modules/ws');
const PORT=+process.argv[2]||18883;const retained=new Map();const clients=new Set();let stats={pub:0,sub:0,conn:0,bad:0};
const len=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d)}while(n>0);return o};
const str=s=>{const b=Buffer.from(s,'utf8');return Buffer.concat([Buffer.from([b.length>>8,b.length&255]),b])};
const pkt=(first,body)=>Buffer.concat([Buffer.from([first,...len(body.length)]),body]);
const match=(f,t)=>{const F=f.split('/'),T=t.split('/');for(let i=0;i<F.length;i++){if(F[i]==='#')return true;if(i>=T.length)return false;if(F[i]!=='+'&&F[i]!==T[i])return false}return F.length===T.length};
const srv=http.createServer((req,res)=>{
 if(req.url==='/stats'){res.end(JSON.stringify({...stats,retained:retained.size,clients:clients.size}));return}
 if(req.url==='/kick'){for(const c of clients)c.ws.terminate();res.end('kicked');return}
 if(req.url==='/clear'){retained.clear();res.end('cleared');return}
 res.end('turf test broker')});
const wss=new WebSocketServer({server:srv,handleProtocols:(ps)=>ps.has('mqtt')?'mqtt':false});
wss.on('connection',(ws,req)=>{
 if(ws.protocol!=='mqtt'){stats.bad++;ws.close();return}
 const c={ws,subs:[],ok:false,buf:Buffer.alloc(0)};clients.add(c);
 const bad=why=>{stats.bad++;console.error('BAD',why);ws.close()};
 ws.on('message',(data,isBinary)=>{
  if(!isBinary){bad('text frame');return}
  c.buf=Buffer.concat([c.buf,data]);
  for(;;){const b=c.buf;if(b.length<2)return;let mult=1,L=0,i=1,x;do{if(i>=b.length)return;x=b[i++];L+=(x&127)*mult;mult*=128;if(i>5){bad('length');return}}while(x&128);
   if(b.length<i+L)return;const type=b[0]>>4,flags=b[0]&15,body=b.subarray(i,i+L);c.buf=b.subarray(i+L);
   if(!c.ok&&type!==1){bad('packet before CONNECT');return}
   if(type===1){if(body.readUInt16BE(0)!==4||body.subarray(2,6).toString()!=='MQTT'||body[6]!==4){bad('protocol');return}if(flags!==0){bad('connect flags');return}
    const cf=body[7];if(cf&1){bad('reserved flag');return}const idl=body.readUInt16BE(10);if(12+idl!==body.length){bad('connect payload');return}
    c.ok=true;stats.conn++;ws.send(pkt(0x20,Buffer.from([0,0])))}
   else if(type===8){if(flags!==2){bad('subscribe flags');return}const pid=body.readUInt16BE(0);let off=2;const granted=[];
    while(off<body.length){const tl=body.readUInt16BE(off);const f=body.subarray(off+2,off+2+tl).toString();off+=2+tl;const q=body[off++];if(q>2){bad('qos');return}c.subs.push(f);granted.push(0);stats.sub++;
     for(const [t,p] of retained)if(match(f,t))ws.send(pkt(0x31,Buffer.concat([str(t),p])))}
    ws.send(pkt(0x90,Buffer.from([pid>>8,pid&255,...granted])))}
   else if(type===3){const qos=(flags>>1)&3,ret=flags&1;if(qos!==0){bad('expected qos0');return}const tl=body.readUInt16BE(0);const t=body.subarray(2,2+tl).toString();const p=Buffer.from(body.subarray(2+tl));stats.pub++;
    if(ret){if(p.length)retained.set(t,p);else retained.delete(t)}
    for(const o of clients)if(o.ok&&o.subs.some(f=>match(f,t)))o.ws.send(pkt(0x30,Buffer.concat([str(t),p])))}
   else if(type===12){ws.send(Buffer.from([0xD0,0]))}
   else if(type===14){ws.close()}
   else if(type===4){}
   else {bad('type '+type);return}
  }});
 ws.on('close',()=>clients.delete(c));
});
srv.listen(PORT,()=>console.log('broker on',PORT));
