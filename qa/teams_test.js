// three phones, three teams, a local relay: create, join by link, play, curse, buy out, go offline and back
const {chromium,phone,act,URL}=require('./h.js');
const RELAY='ws://127.0.0.1:18883/mqtt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(pg,fn,arg,ms=6000){const t0=Date.now();for(;;){const v=await pg.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t0>ms)return null;await sleep(120)}}
(async()=>{const b=await chromium.launch();const log=[];process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH',e.message.split('\n')[0]);process.exit(1)});const ok=(c,m)=>log.push((c?"PASS ":"FAIL ")+m);
 await fetch('http://127.0.0.1:18883/clear');
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});
 // set up three teams with the local relay
 await H.pg.fill('#tn0','Pink');await H.pg.fill('#tm0_0','Rebecca');await H.pg.fill('#tm0_1','Jonathan');
 await H.pg.fill('#tm1_0','Ana');await H.pg.fill('#tm1_1','Ben');await H.pg.fill('#tm2_0','Cy');await H.pg.fill('#tm2_1','Di');
 await H.pg.evaluate(()=>document.querySelector('details').open=true);
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(100);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');
 ok(await until(H.pg,()=>TM.net==="live"),"host connects to the relay");
 await H.pg.screenshot({path:'qa/t_pick.png'});
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.evaluate(()=>{if(xp)xpClose()});
 const link=await H.pg.evaluate(()=>tInviteLink());ok(/#join=[A-Z0-9]{6}&city=la&relay=/.test(link),"invite link carries code, city and relay: "+link.split('#')[1]);
 // two more phones open the invite link
 const hash='#'+link.split('#')[1];
 const A=await phone(b,{mode:"home",city:"sea"},{clock:false,hash}),B=await phone(b,{mode:"home",city:"sea"},{clock:false,hash});
 for(const [P,t] of [[A,"t2"],[B,"t3"]]){ok(await until(P.pg,()=>TM.meta&&TM.teams.t1&&TM.teams.t2&&TM.teams.t3&&!!document.querySelector('[data-act=t-pickteam]')),"joiner finds the game and its teams");
  await act(P.pg,`[data-act=t-pickteam][data-t=${t}]`);await P.pg.evaluate(()=>{if(xp)xpClose()})}
 ok(await A.pg.evaluate(()=>CITY.id==="la"),"joiner switches to the game's city");
 await A.pg.screenshot({path:'qa/t_map_A.png'});
 for(const [n,P] of [["H",H],["A",A],["B",B]])console.log(n,await P.pg.evaluate(()=>JSON.stringify({my:TM.my,teams:Object.keys(TM.teams),net:TM.net,city:CITY.id,mode:MODE})),P.errs.slice(0,3));
 // place teams around Wilshire/Vermont
 const place=(P,cur)=>P.pg.evaluate(cur=>{const T=me();T.cur=cur;T.hop=null;T.vis[cur]=1;tCommitQuiet();tRender()},cur);
 await place(H,"westlake");await place(A,"wnormandie");await place(B,"vbeverly");
 ok(await until(B.pg,()=>TM.teams.t1.cur==="westlake"&&TM.teams.t2.cur==="wnormandie"),"positions sync to other phones");
 // H rides to Wilshire/Vermont, passes, buys the hub for 4
 await H.pg.evaluate(()=>{tAct(()=>tStartHop("wvermont"))});
 const hc=await H.pg.evaluate(()=>me().open&&me().open.id);ok(!!hc,"a card is drawn on the hop: "+hc);
 await H.pg.evaluate(()=>{const o=me().open;o.stakes="safe";o.started=true;tAct(()=>tFinish("win","test"));tAct(()=>tArrive())});
 await H.pg.waitForTimeout(700);await H.pg.screenshot({path:'qa/t_station_H.png'});await H.pg.evaluate(()=>{const o=document.querySelector('#ov');console.log('OV',o&&o.innerHTML.slice(0,300))});
 const canBuy=await H.pg.evaluate(()=>!!document.querySelector('[data-act=t-buy]:not([disabled])'));ok(canBuy,"completing the card lets the team buy the hub");
 await act(H.pg,'[data-act=t-buy]');
 ok(await until(A.pg,()=>tWorld().own.wvermont==="t1"),"A sees Pink own Wilshire/Vermont");
 // curses: Pink plays Rush Hour on Green, Wrong Platform on Teal
 await H.pg.evaluate(()=>{const T=me();T.bank=30;T.hand=[0,2];tCommitQuiet()});
 const e1=await H.pg.evaluate(()=>{TM.cpick={i:0,target:"t2"};return tPlayCurse(0,"t2",null)});ok(e1===null,"Rush Hour played");
 await H.pg.evaluate(()=>tCommitQuiet());
 ok(await until(A.pg,()=>me().fx.rush===true),"Rush Hour lands on Green's phone");
 const basis=await H.pg.evaluate(()=>tNextFrom(TM.teams.t3));
 const e2=await H.pg.evaluate(b=>{const to=ADJ[b][0];const i=me().hand.findIndex(c=>CURSES[c].k==="wrong");return [tPlayCurse(i,"t3",to),to]},basis);
 await H.pg.evaluate(()=>tCommitQuiet());
 ok(e2[0]===null,"Wrong Platform played");
 ok(await until(B.pg,to=>me().fx.wrong&&me().fx.wrong.to===to,e2[1]),"Wrong Platform forces Teal's next stop");
 await B.pg.evaluate(()=>{if(me().hop)me().hop.settled=true;tCommitQuiet();TM.tab="map";tRender()});
 const nav=await B.pg.evaluate(()=>[(document.querySelector('.fgo b')||{}).textContent||"(none)",ST[me().fx.wrong.to].n]);ok(nav[0].includes(nav[1]),"Teal's only choice is the forced stop: "+nav[0]);
 // fizzle and refund: Pink targets Green's old position after Green moved
 await A.pg.evaluate(()=>{if(me().hop)me().hop.settled=true;tCommitQuiet()});
 await H.pg.evaluate(()=>{const T=me();T.hand.push(2);T.bank=20;tCommitQuiet()});
 await sleep(400);
 const stale=await H.pg.evaluate(()=>{const b=tNextFrom(TM.teams.t2),to=ADJ[b][0];return {b,to}});
 await A.pg.evaluate(()=>{const T=me();T.cur="wwestern";T.hop=null;tCommitQuiet()}); // Green moves before the curse lands
 await H.pg.evaluate(s=>{const i=me().hand.findIndex(c=>CURSES[c].k==="wrong");const T=me();T.ev.push({id:T.id+".fz1",k:"curse",c:me().hand[i],target:"t2",basis:s.b,to:s.to,t:Date.now()});T.hand.splice(i,1);T.bank-=2;tInvalidate();tCommitQuiet()},stale);
 ok(await until(H.pg,()=>me().bank===20),"a fizzled Wrong Platform refunds its chips");
 // sealed fail doubles the next team's payout
 await A.pg.evaluate(()=>{const T=me();T.cur="ltokyo";T.hop={to:"ltokyo",from:"broadway",arrived:true,settled:false,first:null,card:"none",lock:true};tOpenLock("ltokyo");T.open.stakes="lock";T.open.started=true;tFinish("fail","test");tCommitQuiet()});
 ok(await until(H.pg,()=>tWorld().fails.ltokyo&&tWorld().fails.ltokyo.t2),"sealed fail is shared");
 const pay=await H.pg.evaluate(()=>{const T=me();T.cur="ltokyo";T.hop={to:"ltokyo",from:"broadway",arrived:true,settled:false,first:null,card:"none",lock:true};T.open=null;tOpenLock("ltokyo");tCommitQuiet();return [me().open.pay,LOCKS.ltokyo.r,me().open.boost]});
 ok(pay[2]===2,"the next team's sealed attempt pays double: "+pay[0]+" (base "+pay[1]+")");
 // offline and back
 await A.pg.evaluate(()=>{TM.R.closed=true;TM.R.ws.close()});
 await A.pg.evaluate(()=>{const T=me();T.cur="wlabrea";T.hop=null;T.vis.wlabrea=1;tCommitQuiet()});
 await sleep(600);
 ok(await H.pg.evaluate(()=>TM.teams.t2.cur!=="wlabrea"),"while Green is offline, others don't see the move");
 await A.pg.evaluate(()=>{TM.R.closed=false;TM.R.connect()});
 ok(await until(H.pg,()=>TM.teams.t2.cur==="wlabrea",null,8000),"after reconnecting, Green's move reaches everyone");
 // everyone agrees on the count
 const scores=await Promise.all([H,A,B].map(P=>P.pg.evaluate(()=>{const s=tScore();return s.order.map(id=>id+":"+s.R[id].tot).join(" ")})));
 ok(scores[0]===scores[1]&&scores[1]===scores[2],"all three phones show the same count: "+scores[0]);
 // a late phone joins as Pink and picks up the same state
 const L=await phone(b,{mode:"home",city:"la"},{clock:false,hash});
 ok(await until(L.pg,()=>TM.meta&&TM.teams.t1&&!!document.querySelector('[data-act=t-pickteam]')),"a late phone finds the game");
 await act(L.pg,'[data-act=t-pickteam][data-t=t1]');
 const hs=await H.pg.evaluate(()=>[me().cur,me().rev,me().bank,me().hand.length].join("/"));
 const ls=await L.pg.evaluate(()=>[me().cur,me().rev,me().bank,me().hand.length].join("/")+" own:"+tWorld().own.wvermont);
 ok(ls.startsWith(hs)&&ls.endsWith("own:t1"),"the late phone picks up Pink's state and the board: "+hs+" vs "+ls);
 for(const [n,P] of [["H",H],["A",A],["B",B],["L",L]])if(P.errs.length)log.push("ERRORS "+n+": "+P.errs.slice(0,3).join(" | "));
 await H.pg.evaluate(()=>{TM.tab="more";tRender()});await H.pg.screenshot({path:'qa/t_more_H.png',fullPage:true});
 await A.pg.evaluate(()=>{TM.tab="map";tRender()});await A.pg.waitForTimeout(500);await A.pg.screenshot({path:'qa/t_map_A2.png'});
 await B.pg.evaluate(()=>{TM.tab="curses";const T=me();T.hand=[1,6];tRender()});await B.pg.screenshot({path:'qa/t_curses_B.png'});
 console.log(log.join("\n"));
 const st=await (await fetch('http://127.0.0.1:18883/stats')).json();console.log("relay:",JSON.stringify(st));
 await b.close()})();
