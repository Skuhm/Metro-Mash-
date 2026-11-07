const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 for(const city of ["la","sea"]){
 const H=await phone(b,{mode:"teams",city,intent:"host"},{clock:false,ctx:{deviceScaleFactor:1}});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.waitForTimeout(300);
 const r=await H.pg.evaluate(()=>{if(!xp)xpOpen("help");xp.auto=false;const out=[];for(let i=0;i<xpSteps().length;i++){try{xpGo(i)}catch(e){out.push(i+": "+e.stack.split("\n").slice(0,3).join(" | "))}}
  // also every widget button on every step
  for(let i=0;i<xpSteps().length;i++){xpGo(i);for(const b of [...document.querySelectorAll('[data-act=xpw]')]){try{b.click()}catch(e){out.push("w"+i+": "+e.message)}}}
  return out});
 console.log(city,r.length?r.join("\n"):"all steps draw");if(H.errs.length)console.log("ERR",H.errs.slice(0,3));await H.ctx.close()}
 await b.close()})();
