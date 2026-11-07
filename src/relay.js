// ================= live sync between phones =================
// A tiny MQTT 3.1.1 client over WebSocket. Every game lives under a topic derived from its code, and every message is
// sealed with AES-GCM using a key derived from the same code, so the public relay only ever sees noise.
const RELAYS=[
 {id:"hivemq",n:"HiveMQ",u:"wss://broker.hivemq.com:8884/mqtt"},
 {id:"emqx",n:"EMQX",u:"wss://broker.emqx.io:8084/mqtt"},
 {id:"eclipse",n:"Eclipse",u:"wss://mqtt.eclipseprojects.io:443/mqtt"},
];
const relayUrl=r=>{const f=RELAYS.find(x=>x.id===r);return f?f.u:(r&&/^wss?:\/\//.test(r)?r:RELAYS[0].u)};
const relayName=r=>{const f=RELAYS.find(x=>x.id===r);return f?f.n:"Custom relay"};
const TE=new TextEncoder(),TD=new TextDecoder();
function mqStr(s){const b=TE.encode(s),o=new Uint8Array(b.length+2);o[0]=b.length>>8;o[1]=b.length&255;o.set(b,2);return o}
function mqLen(n){const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d)}while(n>0);return o}
function mqCat(...arrs){let n=0;for(const a of arrs)n+=a.length;const o=new Uint8Array(n);let i=0;for(const a of arrs){o.set(a,i);i+=a.length}return o}
function mqPacket(first,body){return mqCat(new Uint8Array([first,...mqLen(body.length)]),body)}
class Relay{
 constructor(url,filter,onMsg,onState){this.url=url;this.filter=filter;this.onMsg=onMsg;this.onState=onState||(()=>{});this.ws=null;this.state="off";this.buf=new Uint8Array(0);this.queue=new Map();this.tries=0;this.pid=1;this.timer=null;this.ping=null;this.lastIn=0;this.closed=false;
  this.wake=()=>{if(!this.closed&&this.state!=="live"&&this.state!=="connecting")this.connect(true)};
  addEventListener("online",this.wake);document.addEventListener("visibilitychange",()=>{if(!document.hidden)this.wake()});}
 set(s){if(this.state!==s){this.state=s;this.onState(s)}}
 connect(now){
  clearTimeout(this.timer);if(this.closed)return;
  if(this.ws){try{this.ws.onclose=null;this.ws.close()}catch(e){}this.ws=null}
  this.set("connecting");
  let ws;try{ws=new WebSocket(this.url,["mqtt"])}catch(e){this.retry();return}
  this.ws=ws;ws.binaryType="arraybuffer";this.buf=new Uint8Array(0);
  ws.onopen=()=>{const id="turf-"+rid(12),ka=60;
   ws.send(mqPacket(0x10,mqCat(new Uint8Array([0,4,77,81,84,84,4,2,ka>>8,ka&255]),mqStr(id))))};
  ws.onmessage=ev=>{this.lastIn=Date.now();this.buf=mqCat(this.buf,new Uint8Array(ev.data));this.drain()};
  ws.onerror=()=>{};
  ws.onclose=()=>{clearInterval(this.ping);this.ws=null;if(!this.closed){this.set("offline");this.retry()}};
 }
 retry(){clearTimeout(this.timer);const d=Math.min(15000,800*Math.pow(1.8,this.tries++));this.timer=setTimeout(()=>this.connect(),d)}
 drain(){
  for(;;){const b=this.buf;if(b.length<2)return;
   let mult=1,len=0,i=1,c;do{if(i>=b.length)return;c=b[i++];len+=(c&127)*mult;mult*=128}while(c&128);
   if(b.length<i+len)return;
   const type=b[0]>>4,flags=b[0]&15,body=b.subarray(i,i+len);this.buf=b.slice(i+len);
   if(type===2){if(body[1]===0){this.tries=0;this.set("live");this.subscribe();this.flush();clearInterval(this.ping);this.ping=setInterval(()=>this.keep(),20000)}else{this.set("refused");try{this.ws.close()}catch(e){}}}
   else if(type===3){const tl=(body[0]<<8)|body[1],topic=TD.decode(body.subarray(2,2+tl));let off=2+tl;const qos=(flags>>1)&3;
    if(qos>0){const p1=body[off],p2=body[off+1];off+=2;if(qos===1)this.raw(new Uint8Array([0x40,2,p1,p2]))}
    try{this.onMsg(topic,body.slice(off),!!(flags&1))}catch(e){}}
  }
 }
 keep(){if(Date.now()-this.lastIn>70000){try{this.ws.close()}catch(e){}return}this.raw(new Uint8Array([0xC0,0]))}
 raw(p){if(this.ws&&this.ws.readyState===1){try{this.ws.send(p);return true}catch(e){}}return false}
 subscribe(){const id=this.pid++&0xffff||1;this.raw(mqPacket(0x82,mqCat(new Uint8Array([id>>8,id&255]),mqStr(this.filter),new Uint8Array([0]))))}
 publish(topic,bytes,retain){this.queue.set(topic,{bytes,retain});if(this.state==="live")this.flush()}
 flush(){for(const [t,m] of [...this.queue]){if(this.raw(mqPacket(0x30|(m.retain?1:0),mqCat(mqStr(t),m.bytes))))this.queue.delete(t);else break}}
 close(){this.closed=true;clearTimeout(this.timer);clearInterval(this.ping);removeEventListener("online",this.wake);if(this.ws){try{this.raw(new Uint8Array([0xE0,0]));this.ws.close()}catch(e){}}this.set("off")}
}
// keys and topics come from the game code
const CODE_ABC="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(){let s="";for(const b of crypto.getRandomValues(new Uint8Array(6)))s+=CODE_ABC[b%32];return s}
const cleanCode=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
async function gameKeys(code){
 if(!(window.crypto&&crypto.subtle))throw new Error("insecure");
 const h=new Uint8Array(await crypto.subtle.digest("SHA-256",TE.encode("turf-topic:"+code)));
 const base="turf2/"+[...h.slice(0,12)].map(b=>b.toString(16).padStart(2,"0")).join("");
 const km=await crypto.subtle.importKey("raw",TE.encode("turf-key:"+code),"PBKDF2",false,["deriveKey"]);
 const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:TE.encode("turf-salt-v2"),iterations:60000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 return {base,key};
}
async function sealMsg(key,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,TE.encode(JSON.stringify(obj))));return mqCat(iv,ct)}
async function openMsg(key,bytes){if(!bytes||bytes.length<29)return null;try{const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes.slice(0,12)},key,bytes.slice(12));return JSON.parse(TD.decode(pt))}catch(e){return null}}
