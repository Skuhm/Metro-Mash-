const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+process.cwd()+'/dist/turf.html');
 const r=await p.evaluate(async()=>{const out=[];for(const R of RELAYS){out.push(await new Promise(res=>{let done=false;const t=setTimeout(()=>{if(!done){done=true;res(R.id+": timeout")}},8000);try{const ws=new WebSocket(R.u,["mqtt"]);ws.onopen=()=>{if(!done){done=true;clearTimeout(t);ws.close();res(R.id+": OPEN")}};ws.onerror=e=>{if(!done){done=true;clearTimeout(t);res(R.id+": error")}}}catch(e){res(R.id+": throw "+e.message)}}))}return out});
 console.log(r.join("\n"));await b.close()})();
