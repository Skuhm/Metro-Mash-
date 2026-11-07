const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const out=[];
 for(const [city,scheme] of [["la","light"],["sea","dark"]]){
  const H=await phone(b,{mode:"teams",city,intent:"host"},{clock:false,ctx:{colorScheme:scheme}});
  await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
  await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
  await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);
  await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.evaluate(()=>{if(xp)xpClose()});
  await H.pg.waitForTimeout(600);
  const info=await H.pg.evaluate(()=>{const svg=document.querySelector('svg.base');const t0=performance.now();const B=mapBox({noLegend:true});const s=mapBase(B,{noLegend:true});const t1=performance.now();
   const ids=[...svg.querySelectorAll('linearGradient')].map(g=>g.id);const refs=[...svg.outerHTML.matchAll(/url\(#(dcg[^)]+)\)/g)].map(m=>m[1]);const missing=[...new Set(refs)].filter(r=>!ids.includes(r));
   return {bytes:s.length,ms:Math.round(t1-t0),art:svg.querySelectorAll('.art .dc').length,grads:ids.length,missing:missing.length,anims:document.getAnimations?document.getAnimations().length:-1}});
  out.push(city+" "+scheme+" "+JSON.stringify(info));
  await H.pg.screenshot({path:`qa/art_${city}_${scheme}.png`});
  await H.pg.waitForTimeout(12500);
  out.push(city+" after idle: still="+await H.pg.evaluate(()=>document.querySelector('.mapframe').classList.contains('art-still'))+" running anims="+await H.pg.evaluate(()=>document.getAnimations().filter(a=>a.playState==="running").length));
  if(H.errs.length)out.push("ERR "+H.errs.slice(0,3).join(" | "));
  await H.ctx.close()}
 console.log(out.join("\n"));await b.close()})();
