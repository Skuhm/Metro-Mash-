const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();
 const H=await phone(b,{mode:"home",city:"la"},{clock:false});await H.pg.waitForTimeout(300);
 const el=await H.pg.$('.homethumb');await el.screenshot({path:'qa/home_thumb_la.png'});
 if(H.errs.length)console.log(H.errs);await b.close()})();
