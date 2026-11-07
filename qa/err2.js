const {chromium,phone}=require('./h.js');(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});
await H.pg.waitForTimeout(500);console.log('errs',H.errs.slice(0,3));console.log((await H.pg.evaluate(()=>document.body.innerText)).slice(0,400));await b.close()})();
