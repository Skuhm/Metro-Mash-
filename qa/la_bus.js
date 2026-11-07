const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
 await H.pg.evaluate(()=>{if(xp)xpClose();const T=me();T.cur="wwestern";tCommitQuiet();tRender()});
 await H.pg.waitForTimeout(600);await H.pg.screenshot({path:'qa/la_bus.png'});
 if(H.errs.length)console.log(H.errs);await b.close()})();
