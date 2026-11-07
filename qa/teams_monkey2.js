// two or three phones on different teams tap random buttons at the same time, curses included; then we compare boards
const {chromium,phone,act}=require('./h.js');
const city=process.argv[2]||"la",steps=+(process.argv[3]||250),seed=+(process.argv[4]||1),n=+(process.argv[5]||3);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();
 const H=await phone(b,{mode:"teams",city,intent:"host"},{clock:false});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(400);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
 const link=await H.pg.evaluate(()=>tInviteLink());const hash='#'+link.split('#')[1];
 const P=[H];for(let i=1;i<n;i++){const Q=await phone(b,{mode:"home",city:"sea"},{clock:false,hash});
  for(let k=0;k<60;k++){if(await Q.pg.evaluate(t=>!!document.querySelector(`[data-act=t-pickteam][data-t=${t}]`)&&!!TM.teams[t],"t"+(i+1)))break;await sleep(100)}
  await act(Q.pg,`[data-act=t-pickteam][data-t=t${i+1}]`);P.push(Q)}
 const stacks=P.map(()=>[]);P.forEach((Q,i)=>Q.pg.on('pageerror',e=>stacks[i].push(e.stack)));
 for(const Q of P)await Q.pg.evaluate(()=>{AUC_MS=6000;AUC_GRACE=1000;DUEL_WIN=15000;DUEL_LATE=2000;DUEL_GRACE=1000;DUEL_S=3});
 const res=await Promise.all(P.map((Q,qi)=>Q.pg.evaluate(async ([steps,seed])=>{
  let r=seed;const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff};
  const skip=/^t-(home|forget|reallyforget|showopen|showclose|showtap|qr|copylink|howto|resync|extend|key|zoom|recenter|toastx)$/;
  const out=[];const seen={};
  for(let i=0;i<steps;i++){
   if(xp)xpClose();
   const ov=document.querySelector('#ov');if(ov&&!ov.hidden){ov.click();await new Promise(r=>setTimeout(r,8));continue}
   let bs=[...document.querySelectorAll('[data-act^="t-"]')].filter(e=>!e.disabled&&e.offsetParent!==null&&!skip.test(e.dataset.act));
   // on the curses screen, pick a station to gild if there is a picker
   for(const sel of document.querySelectorAll('select[id^=tg]'))if(sel.offsetParent&&!sel.value&&sel.options.length>1){sel.value=sel.options[1].value}
   const T=me();if(T.open){for(const k of ["tStart","wStart","lapStart","holdStart","studyStart","at"])if(T.open[k])T.open[k]-=20000}
   if(!bs.length){out.push("no buttons at "+i);break}
   // tabs are tapped less often so the game keeps moving
   const w=bs.map(e=>e.dataset.act==="t-tab"?0.25:1),tot=w.reduce((a,b)=>a+b,0);let x=rnd()*tot,e=bs[0];for(let j=0;j<bs.length;j++){x-=w[j];if(x<=0){e=bs[j];break}}
   seen[e.dataset.act]=(seen[e.dataset.act]||0)+1;
   try{e.click()}catch(err){out.push("throw "+err.message)}
   await new Promise(r=>setTimeout(r,8));
  }
  return {out,boards:me().boards,hand:me().hand.length,seen};
 },[steps,seed*7+qi])));
 // phones settle: wait until they agree (or 15 s pass)
 let W=[];for(let k=0;k<50;k++){await sleep(300);W=await Promise.all(P.map(Q=>Q.pg.evaluate(()=>{tInvalidate();const s=tScore();return JSON.stringify(tWorld().own)+s.order.map(id=>id+":"+s.R[id].tot).join()})));if(W.every(x=>x===W[0]))break}
 await sleep(500);W=await Promise.all(P.map(Q=>Q.pg.evaluate(()=>{tInvalidate();return JSON.stringify(tWorld().own)})));
 const S=await Promise.all(P.map(Q=>Q.pg.evaluate(()=>{const s=tScore();return s.order.map(id=>id+":"+s.R[id].tot).join(" ")})));
 const C=await Promise.all(P.map(Q=>Q.pg.evaluate(()=>teamList().map(t=>{const U=TM.teams[t.id];return t.id+"@"+(U?U.cur+"/"+U.rev:"-")}).join(" "))));
 console.log(city,"seed",seed,"phones",n,res.map(r=>"boards "+r.boards+" hand "+r.hand).join(" | "));
 console.log("boards agree:",W.every(x=>x===W[0]),"scores agree:",S.every(x=>x===S[0]),S[0]);
 console.log("world:",await P[0].pg.evaluate(()=>{const W=tWorld();return "auctions "+W.auctions.length+" (won "+W.auctions.filter(a=>a.closed&&a.high).length+"), duels "+W.duels.length+" (attacker "+W.duels.filter(d=>d.res==="attacker").length+", defender "+W.duels.filter(d=>d.res==="defender").length+", pending "+W.duels.filter(d=>!d.res).length+"), claims "+W.claims.length}));
 if(!W.every(x=>x===W[0]))console.log(W.join("\n"));
 if(!C.every(x=>x===C[0]))console.log("positions differ:\n"+C.join("\n"));
 res.forEach((r,i)=>{if(r.out.length)console.log("phone",i,r.out.slice(0,3).join(" / "))});
 stacks.forEach((s,i)=>{if(s.length)console.log("ERRORS phone",i,[...new Set(s)].slice(0,2).join("\n---\n"))});
 const all={};res.forEach(r=>{for(const [k,v] of Object.entries(r.seen))all[k]=(all[k]||0)+v});console.log("acts:",Object.entries(all).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+":"+v).join(" "));
 await b.close()})();
