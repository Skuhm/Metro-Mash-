const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});const pg=H.pg;
 await pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});await pg.selectOption('#trelay','custom');await pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(300);await act(pg,'[data-act=t-pickteam][data-t=t1]');await pg.waitForTimeout(300);await pg.evaluate(()=>{if(xp)xpClose()});
 for(const [id,f] of [["T4","cyt"],["S13","trade"],["S6","scav"]]){await pg.evaluate(id=>{const T=me();if(!T.hop)tStartHop(ADJ[T.cur][0]);T.open=null;tOpenCard(id);TM.tab="cards";tRender()},id);await pg.waitForTimeout(1600);await pg.screenshot({path:`qa/face_${f}.png`})}
 await b.close()})();
