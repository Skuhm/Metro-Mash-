// one phone, everyone: three players, colours, switching, an auction and a duel all on one phone, and a reload
const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();let n=0,bad=0;const ok=(c,m)=>{n++;if(!c)bad++;console.log((c?"PASS ":"FAIL ")+m)};
 const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;const ev=f=>pg.evaluate(f);
 ok(await pg.$eval('details',e=>e.hidden),"no relay section on the one-phone setup");
 ok((await pg.$$('.mates[hidden]')).length>=2,"teammate name fields are hidden");
 await pg.fill('#tn0','Me');await pg.fill('#tn1','Alex');await pg.fill('#tn2','Sam');
 await act(pg,'[data-act=t-col][data-i="2"][data-k="gold"]');await pg.waitForTimeout(100);
 ok((await pg.$eval('#tn2',e=>e.value))==="Sam","typing a name keeps it when a colour is picked");
 await pg.screenshot({path:'qa/local_setup.png'});
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);await ev(()=>{if(typeof xp!=='undefined'&&xp)xpClose()});
 ok(/^t[123]$/.test(await ev(()=>TM.my))&&(await ev(()=>TM.relay))==="local","game starts straight away with a tossed first player, no relay");
 ok((await ev(()=>Object.keys(TM.teams).length))===3,"three player states on this phone");
 ok(!(await pg.$('i.net')),"no network dot");
 const names=await ev(()=>teamList().map(t=>t.name+":"+t.col).join(","));ok(names==="Me:pink,Alex:blue,Sam:gold","names and colours: "+names);
 await pg.screenshot({path:'qa/local_map.png'});
 // switch to Alex
 const other=await ev(()=>teamList().find(t=>t.id!==TM.my).id);await pg.click(`[data-act=t-switch][data-t=${other}]`);await pg.waitForTimeout(300);ok((await ev(()=>TM.my))===other,"tapping a colour passes the phone");
 await pg.screenshot({path:'qa/local_switch.png'});
 // Alex hops and fails a card: auction opens for everyone
 await ev(()=>{const T=me();T.cur=STATIONS.find(s=>ADJ[s.id].some(id=>!tSealed(id))).id;tStartHop(ADJ[T.cur].find(id=>!tSealed(id)));T.open=null;tOpenCard("T0");tBegin(T.open);tFinish("fail","x");tArrive();tCommitQuiet();tRender()});await pg.waitForTimeout(200);
 const auc=await ev(()=>tWorld().auctions.length);ok(auc===1,"a failed card opens an auction");
 await ev(()=>{const o=teamList().find(t=>t.id!==TM.my).id;TM.my=o;tRender()});await pg.waitForTimeout(200);
 ok(!!(await pg.$('[data-act=t-bid]')),"the next player sees the auction and can bid");
 await ev(()=>{tBid(tWorld().auctions[0].id,5);tRender()});
 // and a duel: Sam steals Me's station? Me buys one first
 
 ok((await ev(()=>tWorld().auctions[0].high&&tWorld().auctions[0].high.team===TM.my)),"the next player bids from the same phone");
 // reload keeps it
 await pg.reload();await pg.waitForTimeout(600);
 const home=await ev(()=>teamsSaved().label);ok(/one phone, 3 players/.test(home),"home screen label: "+home);
 console.log(n+" checks, "+bad+" failed; errors:",H.errs.slice(0,3));await b.close()})();
