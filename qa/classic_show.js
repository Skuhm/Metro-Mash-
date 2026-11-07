const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();
 for(const city of ["la","sea"]){const P=await phone(b,{mode:"classic",city},{clock:false});await P.pg.waitForTimeout(400);
  const r=await P.pg.evaluate(()=>{try{if(typeof openShow!=="function")return "no openShow";const st=S&&S.phase;openShow("live");return "phase "+st}catch(e){return "ERR "+e.message}});
  await P.pg.waitForTimeout(600);
  const c=await P.pg.evaluate(()=>{const s=document.querySelector('#show .stage');return s?s.className:"no stage"});
  console.log(city,r,"|",c,P.errs.slice(0,2));await P.ctx.close()}
 await b.close()})();
