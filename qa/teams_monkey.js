// one phone taps random live buttons for a while; we look for page errors and for being stuck
const {chromium,phone,act}=require('./h.js');
const city=process.argv[2]||"la",steps=+(process.argv[3]||300),seed=+(process.argv[4]||1);
(async()=>{const b=await chromium.launch();
 const H=await phone(b,{mode:"teams",city,intent:"host"},{clock:false});const stacks=[];H.pg.on('pageerror',e=>stacks.push(e.stack));
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.evaluate(()=>{if(xp)xpClose()});
 const res=await H.pg.evaluate(async ([steps,seed])=>{
  let r=seed;const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff};
  const skip=/^t-(home|forget|reallyforget|showopen|showclose|showtap|qr|copylink|howto|resync|extend|tab|back|key|zoom|recenter|toastx)$/;
  const out=[];let last=-1,still=0,maxStill=0;const seen={};
  for(let i=0;i<steps;i++){
   if(xp)xpClose();
   const ov=document.querySelector('#ov');if(ov&&!ov.hidden){ov.click();await new Promise(r=>setTimeout(r,5));continue}
   // the tab buttons matter when the action is on another screen
   let bs=[...document.querySelectorAll('[data-act^="t-"]')].filter(e=>!e.disabled&&e.offsetParent!==null&&!skip.test(e.dataset.act));
   const T=me();
   if(!bs.length){const tabs=[...document.querySelectorAll('[data-act="t-tab"],[data-act="t-back"]')].filter(e=>e.offsetParent!==null);if(tabs.length)bs=tabs}
   if(!bs.length){out.push("no buttons at step "+i+" tab="+TM.tab+" hop="+JSON.stringify(T.hop));break}
   // timers: pretend the clock ran out by nudging start times back
   if(T.open){for(const k of ["tStart","wStart","lapStart","holdStart","studyStart","at"])if(T.open[k])T.open[k]-=20000}
   const e=bs[Math.floor(rnd()*bs.length)];seen[e.dataset.act]=(seen[e.dataset.act]||0)+1;
   try{e.click()}catch(err){out.push("throw "+err.message)}
   // fill in any dialogs that want input
   for(const inp of document.querySelectorAll('input[type=number]'))if(inp.offsetParent&&!inp.value){inp.value="3";inp.dispatchEvent(new Event('input',{bubbles:true}))}
   await new Promise(r=>setTimeout(r,3));
   const prog=me().boards*100+(me().hop&&me().hop.settled?1:0)+(me().open?2:0)+Object.keys(tWorld().own).length*7;
   if(prog===last){still++;maxStill=Math.max(maxStill,still);if(still===80)out.push("stuck 80 steps at "+i+": tab="+TM.tab+" hop="+JSON.stringify(T.hop)+" open="+JSON.stringify(T.open&&{id:T.open.id,lock:T.open.lock,started:T.open.started})+" sz="+JSON.stringify(T.sz)+" buttons="+bs.map(b=>b.dataset.act).join(","))}else{still=0;last=prog}
  }
  return {out,boards:me().boards,own:Object.keys(tWorld().own).length,bank:me().bank,hand:me().hand.length,maxStill,seen};
 },[steps,seed]);
 console.log(city,"seed",seed,JSON.stringify({boards:res.boards,own:res.own,bank:res.bank,hand:res.hand,maxStill:res.maxStill}));
 if(res.out.length)console.log(res.out.slice(0,5).join("\n"));
 if(stacks.length)console.log("ERRORS",[...new Set(stacks)].slice(0,3).join("\n---\n"));
 console.log("acts:",Object.entries(res.seen).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+":"+v).join(" "));
 await b.close()})();
