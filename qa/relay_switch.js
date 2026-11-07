// two phones move to a fresh relay mid-game (a second local broker): both teams' states must arrive there,
// and a third phone joining on the new relay must see both teams
const {chromium,phone,act}=require('./h.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(pg,fn,arg,ms=8000){const t0=Date.now();for(;;){const v=await pg.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t0>ms)return null;await sleep(150)}}
(async()=>{const b=await chromium.launch();const log=[];const ok=(c,m)=>log.push((c?"PASS ":"FAIL ")+m);
 const R1='ws://127.0.0.1:18883/mqtt',R2='ws://127.0.0.1:18884/mqtt';
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom',R1);
 await act(H.pg,'[data-act=t-n][data-d="-1"]');
 await act(H.pg,'[data-act=t-create]');await until(H.pg,()=>TM.net==="live");
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
 const hash='#'+(await H.pg.evaluate(()=>tInviteLink())).split('#')[1];
 const A=await phone(b,{mode:"home",city:"la"},{clock:false,hash});
 await until(A.pg,()=>!!document.querySelector('[data-act=t-pickteam][data-t=t2]')&&TM.teams.t2);
 await act(A.pg,'[data-act=t-pickteam][data-t=t2]');
 await A.pg.evaluate(()=>{const T=me();T.cur="wvermont";T.vis.wvermont=1;tCommitQuiet()});
 await H.pg.evaluate(()=>{const T=me();T.cur="pershing";T.vis.pershing=1;tCommitQuiet()});
 ok(await until(H.pg,()=>TM.teams.t2.cur==="wvermont"),"first relay works");
 // both switch to relay 2 with the More screen's picker (custom value set directly)
 for(const P of [H,A])await P.pg.evaluate(r=>{TM.relay=r;tSave();tConnect()},R2);
 ok(await until(H.pg,()=>TM.net==="live"),"host is live on the new relay");
 await sleep(4500);
 const st=await (await fetch('http://127.0.0.1:18884/stats')).json();ok(st.retained>=3,"new relay holds meta and both teams: "+st.retained+" retained");
 // a third phone joins on relay 2 by code
 const code=await H.pg.evaluate(()=>TM.code);
 const L=await phone(b,{mode:"teams",city:"la",intent:"join",joinCode:code,relay:R2},{clock:false});
 ok(await until(L.pg,()=>TM.meta&&TM.teams.t1&&TM.teams.t2&&TM.teams.t2.cur==="wvermont"&&TM.teams.t1.cur==="pershing"),"a phone joining on the new relay sees both teams where they are");
 for(const [n,P] of [["H",H],["A",A],["L",L]])if(P.errs.length)log.push("ERRORS "+n+": "+P.errs.slice(0,3).join(" | "));
 console.log(log.join("\n"));await b.close()})();
