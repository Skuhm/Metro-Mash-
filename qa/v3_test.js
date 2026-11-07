// new team rules on three phones: complete -> buy; fail -> auction everyone bids in; steal by trivia duel;
// the challenged team is held up until it plays; a lost challenge costs the next station; curses only from failed cards
const {chromium,phone,act}=require('./h.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(pg,fn,arg,ms=8000){const t0=Date.now();for(;;){const v=await pg.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t0>ms)return null;await sleep(120)}}
(async()=>{const b=await chromium.launch();const log=[];const ok=(c,m)=>log.push((c?"PASS ":"FAIL ")+m);
 process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH',e.message.split('\n').slice(0,3).join(' '));process.exit(1)});
 await fetch('http://127.0.0.1:18883/clear');
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await until(H.pg,()=>TM.net==="live");
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
 const hash='#'+(await H.pg.evaluate(()=>tInviteLink())).split('#')[1];
 const A=await phone(b,{mode:"home",city:"la"},{clock:false,hash}),B=await phone(b,{mode:"home",city:"la"},{clock:false,hash});
 for(const [P,t] of [[A,"t2"],[B,"t3"]]){await until(P.pg,t=>!!document.querySelector(`[data-act=t-pickteam][data-t=${t}]`)&&!!TM.teams[t],t);await act(P.pg,`[data-act=t-pickteam][data-t=${t}]`)}
 const all=[H,A,B];
 for(const P of all)await P.pg.evaluate(()=>{if(xp)xpClose();AUC_MS=5000;AUC_GRACE=1500;DUEL_WIN=8000;DUEL_LATE=1000;DUEL_GRACE=1000});
 // page helpers
 for(const P of all)await P.pg.evaluate(()=>{
  window.place=(cur)=>{const T=me();T.cur=cur;T.hop=null;T.open=null;T.vis[cur]=1;tCommitQuiet();tRender()};
  window.hop=(to,out)=>{tAct(()=>tStartHop(to));const o=me().open;if(o&&!o.lock){o.stakes="safe";o.started=true;if(out)tAct(()=>tFinish(out,"test"))}tAct(()=>tArrive());TM.reveal=null;tRenderOv();return {first:tFirstOpt(),auc:me().hop.auc||null,hand:me().hand.length}};
 });
 await H.pg.evaluate(()=>place("wvermont"));await A.pg.evaluate(()=>place("expowestern"));await B.pg.evaluate(()=>place("jeffusc"));
 // 1. complete -> buy
 const h1=await H.pg.evaluate(()=>hop("wnormandie","win"));
 ok(h1.first===true,"completing the card unlocks buying");
 await H.pg.evaluate(()=>{TM.tab="cards";tRender()});
 ok(await H.pg.evaluate(()=>!!document.querySelector('[data-act=t-buy]:not([disabled])')),"buy button is live after completing");
 await act(H.pg,'[data-act=t-buy]');
 ok(await until(A.pg,()=>tWorld().own.wnormandie==="t1"),"the purchase syncs");
 // 2. veto -> no buying, auction instead
 const a1=await A.pg.evaluate(()=>{tAct(()=>tStartHop("expocrenshaw"));tAct(()=>tFinish("veto"));tAct(()=>tArrive());return {first:tFirstOpt(),auc:me().hop.auc||null,buy:!!document.querySelector('[data-act=t-buy]')}});
 ok(a1.first===false&&!!a1.auc,"a vetoed card puts the station up for auction");
 ok(await until(B.pg,()=>tWorld().auctions.some(x=>x.s==="expocrenshaw"&&x.open)),"other teams see the auction");
 await B.pg.evaluate(()=>{TM.tab="map";tRender()});await B.pg.waitForTimeout(300);
 await B.pg.screenshot({path:'qa/v3_auction_B.png'});
 ok(await B.pg.evaluate(()=>!!document.querySelector('.aucbar [data-act=t-bid]')),"the auction bar with bid buttons shows on another team's map");
 // bids: B 1, H 6, B 7; A (the team that vetoed) can bid too
 const aid=a1.auc;
 const r1=await B.pg.evaluate(a=>tBid(a,1),aid);await B.pg.evaluate(()=>tCommitQuiet());
 await until(H.pg,a=>{const x=tWorld().auctions.find(y=>y.id===a);return x&&x.high&&x.high.n===1},aid);
 const r2=await H.pg.evaluate(a=>tBid(a,6),aid);await H.pg.evaluate(()=>tCommitQuiet());
 await until(B.pg,a=>{const x=tWorld().auctions.find(y=>y.id===a);return x&&x.high&&x.high.n===6},aid);
 const low=await B.pg.evaluate(a=>tBid(a,5),aid);
 const r3=await B.pg.evaluate(a=>tBid(a,7),aid);await B.pg.evaluate(()=>tCommitQuiet());
 ok(r1===null&&r2===null&&r3===null&&/more than 6/.test(low||""),"bids go up and a low bid is refused ("+low+")");
 const bankB=await B.pg.evaluate(()=>me().bank);
 ok(await until(A.pg,()=>tWorld().own.expocrenshaw==="t3",null,12000),"highest bid wins once the clock runs out");
 ok(await until(B.pg,n=>me().bank===n-7,bankB),"the winner pays its bid");
 ok(await H.pg.evaluate(()=>tWorld().own.expocrenshaw==="t3"),"every phone agrees on the auction winner");
 // 3. curses come only from failed cards
 const handA0=await A.pg.evaluate(()=>me().hand.length);
 const a2=await A.pg.evaluate(()=>{const T=me();T.cur="expocrenshaw";T.hop=null;tCommitQuiet();return hop("farmdale","fail")});
 ok(a2.hand===handA0+1&&!!a2.auc,"a failed card draws a curse and starts an auction");
 // 4. trivia duel: H completes a card at B's station and challenges
 await H.pg.evaluate(()=>place("expowestern"));
 const h2=await H.pg.evaluate(()=>hop("expocrenshaw","win"));
 await H.pg.evaluate(()=>{TM.tab="cards";tRender()});
 ok(await H.pg.evaluate(()=>!!document.querySelector('[data-act=t-challenge]:not([disabled])')),"completing a card at another team's station offers a challenge");
 ok(await H.pg.evaluate(()=>!document.querySelector('[data-act=t-tko]')&&!document.querySelector('[data-act=t-buy]')),"no buyout or free takeover");
 await act(H.pg,'[data-act=t-challenge]');
 ok(await H.pg.evaluate(()=>!document.getElementById('duel').hidden&&!!me().duel),"the duel screen opens");
 await H.pg.screenshot({path:'qa/v3_duel_intro.png'});
 await act(H.pg,'[data-act=t-duelstart]');await H.pg.waitForTimeout(150);
 await H.pg.screenshot({path:'qa/v3_duel_q.png'});
 // H answers: right, right, wrong, right, wrong (3 of 5)
 const plan=[1,1,0,1,0];
 for(const want of plan){await until(H.pg,()=>{const d=me().duel;return d&&d.qStart<=Date.now()&&!!document.querySelector('[data-act=t-dpick]')});
  await H.pg.evaluate(w=>{const d=me().duel,Q=tQuestion(d.qs[d.i],d.seed),o=w?Q.ans:(Q.ans+1)%4;document.querySelector(`[data-act=t-dpick][data-o="${o}"]`).click()},want)}
 ok(await until(H.pg,()=>me().duel&&me().duel.done&&me().duel.score===3),"challenger scores 3 of 5");
 await H.pg.screenshot({path:'qa/v3_duel_done.png'});
 await act(H.pg,'[data-act=t-dueldone]');
 // B must play before hopping
 ok(await until(B.pg,()=>tDuelsDue().length===1),"the challenge lands on the defending team's phone");
 const blocked=await B.pg.evaluate(()=>{const T=me();T.hop=null;tCommitQuiet();const n=ADJ[T.cur][0],k=T.boards;tStartHop(n);return me().boards===k&&!tCanMove()});
 ok(blocked,"the defending team can't start a hop until it plays");
 await B.pg.evaluate(()=>{TM.tab="map";tRender()});await B.pg.waitForTimeout(200);
 ok(await B.pg.evaluate(()=>/Trivia duel/.test(document.querySelector('.fnav').textContent)),"the defending team's main button is the duel");
 await B.pg.screenshot({path:'qa/v3_duel_due_B.png'});
 await act(B.pg,'[data-act=t-duelplay]');await act(B.pg,'[data-act=t-duelstart]');
 // B answers 4 of 5 and keeps it
 for(const want of [1,1,1,1,0]){await until(B.pg,()=>{const d=me().duel;return d&&d.qStart<=Date.now()&&!!document.querySelector('[data-act=t-dpick]')});
  await B.pg.evaluate(w=>{const d=me().duel,Q=tQuestion(d.qs[d.i],d.seed),o=w?Q.ans:(Q.ans+1)%4;document.querySelector(`[data-act=t-dpick][data-o="${o}"]`).click()},want)}
 ok(await until(B.pg,()=>me().duel&&me().duel.done&&tWorld().duels.some(D=>D.res==="defender")),"defender's 4 beats 3");
 await B.pg.waitForTimeout(200);await B.pg.screenshot({path:'qa/v3_duel_result_B.png'});
 await act(B.pg,'[data-act=t-dueldone]');
 ok(await B.pg.evaluate(()=>tWorld().own.expocrenshaw==="t3"),"the defender keeps the station");
 const hH=await H.pg.evaluate(()=>me().hand.length),hB=await B.pg.evaluate(()=>me().hand.length);
 ok(await until(H.pg,()=>me().fx.cool===1),"the losing challenger is cooling off");
 ok(await H.pg.evaluate(n=>me().hand.length===n,hH)&&await B.pg.evaluate(n=>me().hand.length===n,hB),"no curses from the duel");
 // cooling off: next station can't be bought even after completing the card
 const h3=await H.pg.evaluate(()=>{const T=me();T.hop=null;tCommitQuiet();return hop("expowestern","win")});
 await H.pg.evaluate(()=>{TM.tab="cards";tRender()});
 const cool=await H.pg.evaluate(()=>({hop:me().hop.cool,buy:!!document.querySelector('[data-act=t-buy]'),fx:me().fx.cool}));
 ok(cool.hop===true&&!cool.buy&&cool.fx===0,"the next station is off limits while cooling off");
 const h4=await H.pg.evaluate(()=>{const T=me();T.hop.settled=true;tCommitQuiet();return hop("expovermont","win")});
 ok(h4.first===true&&await H.pg.evaluate(()=>!me().hop.cool&&!!document.querySelector('[data-act=t-buy]')||(TM.tab="cards",tRender(),!!document.querySelector('[data-act=t-buy]'))),"buying opens again one station later");
 // 5. forfeit: A challenges H's Wilshire/Normandie and H never plays
 await A.pg.evaluate(()=>place("wvermont"));
 await A.pg.evaluate(()=>hop("wnormandie","win"));
 await A.pg.evaluate(()=>{tAct(()=>tStartChallenge("wnormandie"));const d=me().duel;d.qStart=Date.now()-60000;for(let i=0;i<5;i++){d.qStart=Date.now();tDuelAnswer(null)}me().duel=null;tCommitQuiet()});
 ok(await until(H.pg,()=>tDuelsDue().length===1),"H is challenged");
 ok(await until(A.pg,()=>tWorld().own.wnormandie==="t2",null,16000),"no answer in time hands the station over");
 ok(await until(H.pg,()=>{const T=me();if(T.hop)T.hop.settled=true;return tWorld().own.wnormandie==="t2"&&!tDuelsDue().length&&tCanMove()}),"and the defending team can move again");
 // 6. gilded stations can't be challenged
 await B.pg.evaluate(()=>{const T=me();T.hand=[4];T.bank=20;tPlayCurse(0,null,"expocrenshaw");tCommitQuiet()});
 await A.pg.evaluate(()=>place("expowestern"));
 await until(A.pg,()=>!!tWorld().gild.expocrenshaw);
 await A.pg.evaluate(()=>hop("expocrenshaw","win"));
 const g=await A.pg.evaluate(()=>tCanChallenge("expocrenshaw"));
 ok(!g.ok&&/Gilded/.test(g.why||""),"a gilded station can't be challenged ("+g.why+")");
 // everyone agrees
 let S=[];for(let k=0;k<30;k++){S=await Promise.all(all.map(P=>P.pg.evaluate(()=>{tInvalidate();const s=tScore();return JSON.stringify(tWorld().own)+" "+s.order.map(id=>id+":"+s.R[id].tot).join(" ")})));if(S[0]===S[1]&&S[1]===S[2])break;await sleep(300)}
 ok(S[0]===S[1]&&S[1]===S[2],"all phones agree: "+S.join(" / ").slice(0,300));
 for(const [n,P] of [["H",H],["A",A],["B",B]])if(P.errs.length)log.push("ERRORS "+n+": "+P.errs.slice(0,3).join(" | "));
 console.log(log.join("\n"));await b.close()})();
