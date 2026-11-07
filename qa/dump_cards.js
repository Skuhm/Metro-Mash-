const {chromium,phone}=require('./h.js');const fs=require('fs');
(async()=>{const b=await chromium.launch();const P=await phone(b,{mode:"home",city:"la"},{clock:false});
 const out=await P.pg.evaluate(()=>{const o={};for(const c of ["la","sea"]){loadCity(c);
  o[c]={cards:CARDS.map(x=>({id:x.id,fam:x.fam,n:x.n,w:x.w,d:x.d,c:x.c,t:x.t,r:x.r,ride:!!x.ride,span:!!x.span,duel:!!x.duel,list:x.list||null,timer:x.timer||null})),
   locks:STATIONS.filter(s=>s.lock).map(s=>({id:s.id,st:s.n,p:s.p,...LOCKS[s.id]}))}}
  return o});
 fs.writeFileSync('/tmp/claude-0/-home-claude/584c2d44-48f5-5079-b1e8-91b8ca638acd/scratchpad/cards_dump.json',JSON.stringify(out,null,1));
 console.log(Object.keys(out.la.locks[0]).join(","),out.la.cards.length,out.la.locks.length,out.sea.locks.length);
 await b.close()})();
