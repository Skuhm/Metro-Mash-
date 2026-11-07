const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 const H=await phone(b,{mode:"teams",city:process.argv[2]||"la",intent:"host"},{clock:false,ctx:{deviceScaleFactor:1}});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.waitForTimeout(300);
 const n=await H.pg.evaluate(()=>{if(!xp)xpOpen("help");xp.auto=false;return xpSteps().length});
 for(let i=0;i<n;i++){await H.pg.evaluate(i=>{xpGo(i)},i).catch(async()=>{await act(H.pg,'[data-act=xpnext]')});await H.pg.waitForTimeout(700);await H.pg.screenshot({path:`qa/xp_${String(i).padStart(2,'0')}.png`})}
 if(H.errs.length)console.log("ERR",H.errs.slice(0,3));
 console.log(n,"steps");await b.close()})();
