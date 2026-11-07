const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);await pg.evaluate(()=>{if(xp)xpClose()});await pg.waitForTimeout(2600);
 for(const id of ["civic","ltokyo","broadway"]){const el=await pg.$(`#main g.st[data-id="${id}"]`);if(!el){console.log(id,"no element");continue}const bb=await el.boundingBox();
  const hit=await pg.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);const g=e&&e.closest('g.st');return (g?"station "+g.dataset.id:"blocked by "+e.tagName+"."+(e.className.baseVal||e.className)+" parent "+(e.parentElement.className.baseVal||e.parentElement.className))},[bb.x+bb.width/2,bb.y+bb.height/2]);
  await pg.tap(`#main g.st[data-id="${id}"]`).catch(e=>console.log("tap failed",e.message.split("\n")[0]));await pg.waitForTimeout(200);
  console.log(id,"hit:",hit,"| sel:",await pg.evaluate(()=>TM.sel),"| main:",await pg.$eval('.fgo b',e=>e.textContent))}
 await b.close()})();
