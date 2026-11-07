const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false,ctx:{viewport:{width:375,height:667},colorScheme:'dark'}});
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(400);await H.pg.evaluate(()=>{if(!xp)xpOpen("help");xp.auto=false;xpGo(4)});await H.pg.waitForTimeout(500);
 const nav=await H.pg.$('.xp-nav');await nav.screenshot({path:'qa/s5_nav.png'});await b.close()})();
