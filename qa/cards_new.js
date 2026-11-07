// the reworked deck on one phone: declare buttons, the fail penalty, per-area scavenger lists, Train Pong in a row, Trade Up bonus, the new Public Comment
const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();let n=0,bad=0;const ok=(c,m)=>{n++;if(!c)bad++;console.log((c?"PASS ":"FAIL ")+m)};
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});const pg=H.pg;
 await pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await pg.selectOption('#trelay','custom');await pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(300);await act(pg,'[data-act=t-pickteam][data-t=t1]');await pg.waitForTimeout(300);await pg.evaluate(()=>{if(typeof xp!=='undefined'&&xp)xpClose()});
 const ev=f=>pg.evaluate(f);
 // deck
 const deck=await ev(()=>TEAM_DECK().map(id=>CARD[id].fam[0]).join(""));ok(!deck.includes("G")&&deck.length===17,"deck is 17 cards, no gambits: "+deck);
 // hop and open Call Your Takes
 await ev(()=>{const T=me();tStartHop(ADJ[T.cur][0]);T.open=null;tOpenCard("T4");TM.tab="cards";tRender()});await pg.waitForTimeout(200);
 const decl=await pg.$$eval('[data-act=t-decl]',a=>a.map(e=>e.textContent));ok(decl.length===4&&/\+11/.test(decl[1])&&/−11/.test(decl[1]),"declare buttons show the payout and the loss: "+decl[1]);
 ok(!(await pg.$('[data-act=t-stake]')),"no stakes buttons");
 const failTxt=await pg.$eval('dl',e=>e.textContent);ok(/Fail/.test(failTxt)&&/declared/.test(failTxt),"card face explains the fail penalty");
 await act(pg,'[data-act=t-decl][data-n="3"]');await act(pg,'[data-act=t-begin]');await pg.waitForTimeout(100);
 const bank0=await ev(()=>me().bank);
 await ev(()=>{tAct(()=>{tFinish("fail","test")})});await pg.waitForTimeout(100);
 const bank1=await ev(()=>me().bank);ok(bank1===Math.max(0,bank0-11),"missing a declared 3 costs 11 (floored at 0): "+bank0+" → "+bank1);
 await pg.screenshot({path:'qa/new_cyt.png'});
 // a normal fail costs half
 await ev(()=>{me().bank=20;tOpenCard("T0");tRender()});await act(pg,'[data-act=t-begin]');await ev(()=>{tAct(()=>tFinish("fail","x"))});
 ok((await ev(()=>me().bank))===15,"failing a 10-chip card costs 5");
 await ev(()=>{tOpenCard("T0");tRender()});await act(pg,'[data-act=t-begin]');await ev(()=>{tAct(()=>tFinish("win","x"))});
 ok((await ev(()=>me().bank))===25,"completing it pays 10");
 // scavenger list follows the area
 const lists=await ev(()=>{const out={};for(const id of ["union","hvine","wfairfax","culver"]){const T=me();T.hop={to:id,from:T.cur,arrived:false};tOpenCard("S6");out[id]=spec(T.open).list[0]}return out});
 ok(lists.union.includes("food truck")&&lists.hvine.includes("costumed")&&lists.wfairfax.includes("barbecue")&&lists.culver.includes("taco"),"scavenger list changes with the part of town: "+JSON.stringify(lists));
 // Train Pong: a miss resets the run
 await ev(()=>{const T=me();T.hop={to:"civic",from:"union",arrived:false,settled:false};tOpenCard("S8");tRender()});await act(pg,'[data-act=t-begin]');
 await act(pg,'[data-act=t-throwin]');await act(pg,'[data-act=t-throwin]');await act(pg,'[data-act=t-throwout]');
 ok((await ev(()=>me().open.tally))===0,"a miss resets Train Pong to zero in a row");
 await act(pg,'[data-act=t-throwin]');await act(pg,'[data-act=t-throwin]');await act(pg,'[data-act=t-throwin]');await pg.waitForTimeout(100);
 ok((await ev(()=>me().open))===null,"three in a row wins it");
 // Trade Up bonus
 await ev(()=>{tOpenCard("S13");tRender()});await act(pg,'[data-act=t-begin]');await pg.waitForTimeout(100);
 ok(!!(await pg.$('[data-act=t-bonus]')),"Trade Up shows the $20 bonus toggle");await pg.screenshot({path:'qa/new_trade.png'});
 await act(pg,'[data-act=t-bonus]');const bk=await ev(()=>me().bank);await ev(()=>{tAct(()=>tFinish("win","x"))});
 ok((await ev(()=>me().bank))===bk+20,"Trade Up with the bonus pays 20");
 // Public Comment: ten votes then the call
 await ev(()=>{const T=me();T.cur="civic";T.hop={to:"civic",from:"union",arrived:true,settled:false,lock:true};tOpenLock("civic");tRender()});await act(pg,'[data-act=t-begin]');
 for(let i=0;i<10;i++)await act(pg,`[data-act=t-vote][data-v="${i%3?0:1}"]`);await pg.waitForTimeout(100);
 ok((await ev(()=>me().open&&me().open.lock))===true,"ten votes don't finish Public Comment on their own");
 ok(!!(await pg.$('[data-act=t-call][data-v=win]')),"the team calls the announcement");await pg.screenshot({path:'qa/new_civic.png'});
 await act(pg,'[data-act=t-call][data-v=win]');await pg.waitForTimeout(100);ok((await ev(()=>tWorld().own.civic))==="t1","and wins the station");
 // no role text anywhere on the map screen
 await ev(()=>{TM.tab="map";tRender()});await pg.waitForTimeout(100);const txt=await ev(()=>document.body.innerText);
 ok(!/ is up\b|films/.test(txt),"no Up or films wording on the map screen");
 // explainer step list
 const steps=await ev(()=>{xpOpen("help");return xpSteps().map(s=>s.t)});ok(steps.length===5&&steps.includes("Win It To Buy It")&&!steps.some(t=>/stakes|films/.test(t)),"explainer: "+steps.join(" | "));
 console.log(n+" checks, "+bad+" failed; errors:",H.errs.slice(0,3));await b.close()})();
