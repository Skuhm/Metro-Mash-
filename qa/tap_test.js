const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);await pg.evaluate(()=>{if(xp)xpClose()});await pg.waitForTimeout(2500);
 const main0=await pg.$eval('.fgo b',e=>e.textContent);const chip=await pg.$('.fchip');const box=await chip.boundingBox();
 console.log("main:",main0,"chip box:",box, "viewport", await pg.evaluate(()=>innerHeight));
 console.log("top element at chip:",await pg.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e.tagName+"."+e.className+" in "+(e.closest('.fchip')?'chip':'other:'+(e.closest('[id]')||{}).id)},[box.x+box.width/2,box.y+box.height/2]));
 await pg.tap('.fchip');await pg.waitForTimeout(300);console.log("after tap main:",await pg.$eval('.fgo b',e=>e.textContent));
 await b.close()})();
