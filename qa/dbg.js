const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;
 console.log(await pg.$eval('details',e=>e.outerHTML.slice(0,80)));
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);await pg.evaluate(()=>{if(xp)xpClose()});
 console.log(await pg.evaluate(()=>{const T=me();const to=ADJ[T.cur][0];const to2=ADJ[T.cur].find(id=>!tSealed(id));tStartHop(to2);T.open=null;tOpenCard("T0");tBegin(T.open);tFinish("fail","x");const f=T.hop.first;tArrive();return JSON.stringify({to2,card:T.hop.card,open:!!T.open,first:f,settled:T.hop.settled,auc:T.hop.auc,ev:T.ev.length,W:tWorld().auctions.length,own:tWorld().own[to2]})}));
 await b.close()})();
