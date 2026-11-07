// repeated duels between two phones with random answers, timeouts, "later", forfeits and a second phone taking over
const {chromium,phone,act}=require('./h.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rounds=+(process.argv[2]||8);
async function until(pg,fn,arg,ms=9000){const t0=Date.now();for(;;){const v=await pg.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t0>ms)return null;await sleep(100)}}
(async()=>{const b=await chromium.launch();const log=[];
 const H=await phone(b,{mode:"teams",city:"sea",intent:"host"},{clock:false});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-n][data-d="-1"]');
 await act(H.pg,'[data-act=t-create]');await until(H.pg,()=>TM.net==="live");await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
 const hash='#'+(await H.pg.evaluate(()=>tInviteLink())).split('#')[1];
 const A=await phone(b,{mode:"home",city:"la"},{clock:false,hash});
 await until(A.pg,()=>!!document.querySelector('[data-act=t-pickteam][data-t=t2]')&&!!TM.teams.t2);await act(A.pg,'[data-act=t-pickteam][data-t=t2]');
 // a second phone on team A, to take a duel over halfway
 const A2=await phone(b,{mode:"home",city:"la"},{clock:false,hash});
 await until(A2.pg,()=>!!document.querySelector('[data-act=t-pickteam][data-t=t2]')&&!!TM.teams.t2);await act(A2.pg,'[data-act=t-pickteam][data-t=t2]');
 const errs=[];for(const P of [H,A,A2])P.pg.on('pageerror',e=>errs.push(e.message));
 for(const P of [H,A,A2])await P.pg.evaluate(()=>{if(xp)xpClose();DUEL_S=2;DUEL_WIN=20000;DUEL_LATE=4000;DUEL_GRACE=800;AUC_MS=3000;AUC_GRACE=800});
 const stations=await H.pg.evaluate(()=>STATIONS.filter(s=>!s.lock&&ADJ[s.id].length).map(s=>s.id));
 const rnd=n=>Math.floor(Math.random()*n);
 const answer=async(P,mode)=>{ // tap through a duel on this phone: random picks, some timeouts
  for(let k=0;k<400;k++){const st=await P.pg.evaluate(()=>{const d=me().duel;if(!d)return "none";if(d.done)return "done";if(d.qStart==null)return "intro";return Date.now()<d.qStart?"beat":"q"}).catch(()=>"err");
   if(st==="none")return "none";if(st==="done"){await P.pg.evaluate(()=>document.querySelector('[data-act=t-dueldone]')&&document.querySelector('[data-act=t-dueldone]').click());return "done"}
   if(st==="intro"){await P.pg.evaluate(()=>document.querySelector('[data-act=t-duelstart]').click())}
   else if(st==="beat"){await sleep(300);continue}
   else if(st==="q"){if(Math.random()<0.8)await P.pg.evaluate(o=>{const b=document.querySelector(`[data-act=t-dpick][data-o="${o}"]`);if(b)b.click()},rnd(4));else await sleep(2300)}
   await sleep(60)}
  return "stuck"};
 let wins={attacker:0,defender:0,forfeit:0,void:0},stuck=0;
 for(let r=0;r<rounds;r++){
  // A owns a random station; H stands next to it and completes a card on the way in
  const s=stations[rnd(stations.length)];
  await A.pg.evaluate(s=>{const T=me();T.claims.push({id:T.id+".x"+Math.random().toString(36).slice(2,7),s,t:Date.now(),how:"buy"});T.hop=null;T.duel=null;tCommitQuiet()},s);
  await until(H.pg,s=>tWorld().own[s]==="t2",s);
  const n=await H.pg.evaluate(s=>{const T=me();const nb=ADJ[s][0];T.cur=nb;T.hop=null;T.duel=null;T.fx.cool=0;tCommitQuiet();tAct(()=>tStartHop(s));const o=me().open;if(o&&!o.lock){o.stakes="safe";o.started=true;tAct(()=>tFinish("win","t"))}tAct(()=>tArrive());TM.reveal=null;return tCanChallenge(s)},s);
  if(!n.ok){log.push("round "+r+": can't challenge at "+s+" ("+(n.why||"")+")");continue}
  await H.pg.evaluate(()=>document.querySelector('[data-act=t-challenge]')?document.querySelector('[data-act=t-challenge]').click():tAct(()=>tStartChallenge(me().cur)));
  await H.pg.evaluate(()=>{if(!me().duel)tAct(()=>tStartChallenge(me().cur))});
  const ha=await answer(H,"attack");if(ha==="stuck")stuck++;
  const due=await until(A.pg,()=>tDuelsDue().length>0);
  if(!due){log.push("round "+r+": duel never landed");stuck++;continue}
  const mode=Math.random();
  if(mode<0.2){/* forfeit: never play */}
  else if(mode<0.35){ // start on A, give up halfway, take over on A2
   await A.pg.evaluate(()=>{const D=tDuelsDue()[0];tAct(()=>tStartDefense(D.id))});await A.pg.evaluate(()=>document.querySelector('[data-act=t-duelstart]').click());
   await A.pg.evaluate(()=>{const b=document.querySelector('[data-act=t-dpick]');if(b)b.click()});
   await until(A2.pg,()=>me().duel&&me().duel.phone!==TM.phone);
   await A2.pg.evaluate(()=>{const b=document.querySelector('[data-act=t-duelhere]');if(b)b.click()});
   const a2=await answer(A2,"defend");if(a2==="stuck")stuck++;
  }else{
   if(Math.random()<0.3){await A.pg.evaluate(()=>{const D=tDuelsDue()[0];tAct(()=>tStartDefense(D.id))});await A.pg.evaluate(()=>{const b=document.querySelector('[data-act=t-duelcancel]');if(b)b.click()})}
   await A.pg.evaluate(()=>{const D=tDuelsDue()[0];if(D)tAct(()=>tStartDefense(D.id))});
   const da=await answer(A,"defend");if(da==="stuck")stuck++;
  }
  const res=await until(H.pg,()=>{const D=tWorld().duels[tWorld().duels.length-1];return D&&D.res?(D.void?"void":D.forfeit?"forfeit":D.res):null},null,40000);
  if(!res){log.push("round "+r+": no result");stuck++;continue}
  wins[res]=(wins[res]||0)+1;
  // both phones agree, and both teams can move again
  const agree=await until(A.pg,s=>tWorld().own[s]!=null,s);
  const own=await Promise.all([H,A,A2].map(P=>P.pg.evaluate(s=>{tInvalidate();return tWorld().own[s]},s)));
  if(!(own[0]===own[1]&&own[1]===own[2]))log.push("round "+r+": owners differ "+own.join(","));
  const mv=await Promise.all([H,A].map(P=>P.pg.evaluate(()=>{const T=me();if(T.duel&&T.duel.done)T.duel=null;if(T.hop)T.hop.settled=true;tCommitQuiet();return tCanMove()})));
  if(!mv[0]||!mv[1])log.push("round "+r+": can't move "+mv.join(","));
  const cool=await H.pg.evaluate(()=>me().fx.cool);
  if(res==="defender"&&cool!==1)log.push("round "+r+": lost challenge but no cooling off");
  if(res!=="defender"&&cool!==0)log.push("round "+r+": cooling off after a win");
 }
 console.log("results",JSON.stringify(wins),"stuck",stuck);
 if(log.length)console.log(log.join("\n"));
 if(errs.length)console.log("ERRORS",[...new Set(errs)].slice(0,4).join(" | "));
 await b.close()})();
