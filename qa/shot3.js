const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 let H=await phone(b,{mode:"teams",city:"sea",intent:"host"},{clock:false});await act(H.pg,'[data-act=t-pc][data-i="0"][data-d="1"]');await act(H.pg,'[data-act=t-pc][data-i="1"][data-d="-1"]');await H.pg.waitForTimeout(150);await H.pg.screenshot({path:'qa/s3_setup.png'});
 const pc=await H.pg.evaluate(()=>TM.setup.teams.slice(0,2).map(t=>t.pc).join(","));console.log("sizes",pc);await H.ctx.close();
 H=await phone(b,{mode:"teams",city:"sea",intent:"local"},{clock:false});console.log("spread disabled",await H.pg.$eval('[data-act=t-start][data-k=spread]',e=>e.disabled));
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(500);await H.pg.evaluate(()=>{if(!xp)xpOpen("help");xp.auto=false;xpGo(6)});await H.pg.waitForTimeout(600);await H.pg.screenshot({path:'qa/s3_stars.png'});
 await H.pg.evaluate(()=>xpGo(2));await H.pg.waitForTimeout(600);await H.pg.screenshot({path:'qa/s3_win.png'});console.log(H.errs);await b.close()})();
