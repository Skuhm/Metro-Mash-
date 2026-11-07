// compare the Seattle data in the new app against the original Seattle game, field by field
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
 const o=await b.newPage();await o.goto('file://'+process.cwd()+'/../turf_la.html');await o.waitForTimeout(400);
 const orig=await o.evaluate(()=>JSON.stringify({LOCKS,STATIONS:STATIONS.map(s=>({id:s.id,n:s.n,p:s.p,lock:!!s.lock})),CARDS:CARDS.map(c=>({id:c.id,n:c.n,d:c.d,c:c.c,t:c.t,r:c.r,list:c.list})),MAJ:typeof MAJ!=="undefined"?MAJ:null,CURSES}));
 const n=await b.newPage();await n.addInitScript(()=>localStorage.setItem('turf.app',JSON.stringify({mode:"home",city:"la"})));await n.goto('file://'+process.cwd()+'/dist/turf.html');await n.waitForTimeout(400);
 const now=await n.evaluate(()=>JSON.stringify({LOCKS,STATIONS:STATIONS.map(s=>({id:s.id,n:s.n,p:s.p,lock:!!s.lock})),CARDS:CARDS.map(c=>({id:c.id,n:c.n,d:c.d,c:c.c,t:c.t,r:c.r,list:c.list})),MAJ,CURSES}));
 const A=JSON.parse(orig),B=JSON.parse(now);const diffs=[];
 for(const k of Object.keys(A.LOCKS)){const a=A.LOCKS[k],z=B.LOCKS[k];if(!z){diffs.push("lock missing "+k);continue}for(const f of Object.keys(a))if(JSON.stringify(a[f])!==JSON.stringify(z[f]))diffs.push("lock "+k+"."+f+": "+JSON.stringify(a[f]).slice(0,60)+" → "+JSON.stringify(z[f]).slice(0,60))}
 const bs=Object.fromEntries(B.STATIONS.map(s=>[s.id,s]));for(const s of A.STATIONS){const z=bs[s.id];if(!z)diffs.push("station missing "+s.id);else if(JSON.stringify(s)!==JSON.stringify(z))diffs.push("station "+JSON.stringify(s)+" → "+JSON.stringify(z))}
 const bc=Object.fromEntries(B.CARDS.map(c=>[c.id,c]));for(const c of A.CARDS){const z=bc[c.id];if(!z){diffs.push("card missing "+c.id);continue}for(const f of Object.keys(c))if(JSON.stringify(c[f])!==JSON.stringify(z[f]))diffs.push("card "+c.id+"."+f+": "+JSON.stringify(c[f]).slice(0,70)+" → "+JSON.stringify(z[f]).slice(0,70))}
 if(A.MAJ)diffs.push(JSON.stringify(A.MAJ)===JSON.stringify(B.MAJ)?"areas same":"areas differ");
 console.log(diffs.length?diffs.join("\n"):"no differences");await b.close()})();
