const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);await pg.evaluate(()=>{if(xp)xpClose()});
 console.log(await pg.evaluate(()=>{const T=me();const out=[];tStartHop("civic");out.push(!!T.hop);T.open=null;tOpenCard("T0");out.push(!!T.hop);tBegin(T.open);out.push(!!T.hop);tFinish("fail","x");out.push(!!T.hop,!!me().hop,T===me());return out.join(",")}));console.log(await pg.evaluate(()=>{const T=me();return JSON.stringify({my:TM.my,cur:T.cur,can:tCanMove(),locked:tLocked(),sz:!!T.sz,duel:!!T.duel,due:tDuelsDue().length,adj:ADJ[T.cur],stop:new Date(TM.meta.stopTs).toString(),now:new Date().toString()})}));
 console.log(H.errs);await b.close()})();
