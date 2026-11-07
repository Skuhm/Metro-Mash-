const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);
 console.log("toss flash:",await pg.evaluate(()=>(document.querySelector('.flash, .fl, #ov')||{}).textContent?.includes("goes first")));
 await pg.evaluate(()=>{if(xp)xpClose()});await pg.waitForTimeout(200);await pg.click('body');await pg.waitForTimeout(300);
 console.log("chips:",await pg.$$eval('.fchip',a=>a.map(e=>e.textContent)));
 console.log("vvh:",await pg.evaluate(()=>getComputedStyle(document.body).height+" / "+innerHeight));
 await pg.screenshot({path:'qa/fit.png'});console.log(H.errs);await b.close()})();
