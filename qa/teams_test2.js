// Seattle, two teams, spread start, a typed code with a custom relay, the hard stop, the final count and show mode
const {chromium,phone,act}=require('./h.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(pg,fn,arg,ms=6000){const t0=Date.now();for(;;){const v=await pg.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t0>ms)return null;await sleep(120)}}
(async()=>{const b=await chromium.launch();const log=[];const ok=(c,m)=>log.push((c?"PASS ":"FAIL ")+m);
 process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH',e.message.split('\n')[0]);process.exit(1)});
 const H=await phone(b,{mode:"teams",city:"sea",intent:"host"},{clock:false});
 await act(H.pg,'[data-act=t-n][data-d="-1"]');
 await act(H.pg,'[data-act=t-start][data-k=spread]');
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(100);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await H.pg.screenshot({path:'qa/t2_setup.png',fullPage:true});
 await act(H.pg,'[data-act=t-create]');
 ok(await until(H.pg,()=>TM.net==="live"),"Seattle host connects");
 const code=await H.pg.evaluate(()=>TM.code);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.evaluate(()=>{if(xp)xpClose()});
 const starts=await H.pg.evaluate(()=>TM.meta.teams.map(t=>t.start).join(","));ok(starts.split(",").length===2&&starts.split(",")[0]!==starts.split(",")[1],"spread start puts teams at different ends: "+starts);
 // second phone types the code and the custom relay
 const A=await phone(b,{mode:"teams",city:"la",intent:"join"},{clock:false});
 await A.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await A.pg.selectOption('#tjrelay','custom');await A.pg.waitForTimeout(100);await A.pg.fill('#tjcustom','ws://127.0.0.1:18883/mqtt');
 await A.pg.fill('#tcode',code.toLowerCase());
 await act(A.pg,'[data-act=t-joingo]');
 ok(await until(A.pg,()=>!!document.querySelector('[data-act=t-pickteam][data-t=t2]')&&TM.teams.t2,null,9000),"typed code (lower case) with a custom relay finds the game");
 await act(A.pg,'[data-act=t-pickteam][data-t=t2]');await A.pg.evaluate(()=>{if(xp)xpClose()});
 ok(await A.pg.evaluate(()=>CITY.id==="sea"&&me().cur===TM.meta.teams[1].start),"joiner is in Seattle at its own start");
 await A.pg.waitForTimeout(400);await A.pg.screenshot({path:'qa/t2_map_A.png'});
 // a few real hops on each phone through the UI: tap the main button, then settle the card as a pass
 for(const P of [H,A])for(let i=0;i<3;i++){
  const r=await act(P.pg,'.fnav [data-act=t-hop]');if(r!=="ok"){log.push("hop "+i+": "+r+" nav="+await P.pg.evaluate(()=>{const n=document.querySelector('.fnav');return (n?n.textContent:"(no nav)")+" tab="+TM.tab+" hop="+JSON.stringify(me().hop)+" open="+JSON.stringify(me().open&&me().open.id)}));break}
  const er=await P.pg.evaluate(()=>{try{const o=me().open;if(o&&!o.lock){o.stakes="safe";o.started=true;tAct(()=>tFinish("win","test"))}if(me().hop&&!me().hop.arrived)tAct(()=>tArrive());const T=me();if(T.open&&T.open.lock){T.open.started=true;tAct(()=>tFinish("fail","test"))}}catch(e){return e.stack+" | hop "+JSON.stringify(me().hop)+" open "+JSON.stringify(me().open)}});if(er){log.push("ERR "+er);break}
  const by=await P.pg.evaluate(()=>!!document.querySelector('[data-act=t-buy]:not([disabled])'));if(by)await act(P.pg,'[data-act=t-buy]');
  await P.pg.evaluate(()=>{const T=me();if(T.hop&&!T.hop.settled){T.hop.settled=true;tCommitQuiet();tRender()}});
 }
 const W=await Promise.all([H,A].map(P=>P.pg.evaluate(()=>JSON.stringify(tWorld().own))));
 await sleep(500);
 const W2=await Promise.all([H,A].map(P=>P.pg.evaluate(()=>JSON.stringify(tWorld().own))));
 ok(W2[0]===W2[1]&&W2[0]!=="{}","both phones agree on ownership after UI hops: "+W2[0]);
 // host moves the hard stop to now: both lock into the count
 await H.pg.evaluate(()=>{TM.meta.stopTs=now()-1000;TM.meta.rev++;tSave();tPublish();tRender()});
 ok(await until(A.pg,()=>tLocked()&&document.querySelector('.fnav')&&/count/i.test(document.querySelector('.fnav').textContent)),"hard stop locks the other phone and points to the count");
 const can=await A.pg.evaluate(()=>{const n=ADJ[me().cur][0];const k=me().boards;tStartHop(n);return me().boards===k});ok(can,"no hops after the hard stop");
 await A.pg.evaluate(()=>{TM.tab="more";tRender()});await A.pg.screenshot({path:'qa/t2_final_A.png',fullPage:true});
 // show mode
 const r=await A.pg.evaluate(()=>{const b=document.querySelector('[data-act=t-showopen]');if(!b)return "no show button";b.click();return "ok"});ok(r==="ok","show mode button: "+r);
 await A.pg.waitForTimeout(1500);await A.pg.screenshot({path:'qa/t2_show_A.png'});
 for(const [n,P] of [["H",H],["A",A]])if(P.errs.length)log.push("ERRORS "+n+": "+P.errs.slice(0,3).join(" | "));
 console.log(log.join("\n"));await b.close()})();
