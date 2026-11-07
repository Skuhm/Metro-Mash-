const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();let H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});await H.pg.waitForTimeout(200);await H.pg.screenshot({path:'qa/s4_setup.png'});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});await H.pg.selectOption('#trelay','custom');await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(400);await H.pg.screenshot({path:'qa/s4_pick.png'});console.log(H.errs);await b.close()})();
