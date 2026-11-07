const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();
 const A=await phone(b,{mode:"home",city:"la"},{clock:false}),B=await phone(b,{mode:"home",city:"la"},{clock:false});
 const setup=async(P,name)=>P.pg.evaluate(async name=>{
  window.got=[];const k=await gameKeys("TEST42");window.K=k;
  window.R=new Relay("ws://127.0.0.1:18883/mqtt",k.base+"/#",async(t,bytes,ret)=>{const m=await openMsg(k.key,bytes);window.got.push({t:t.slice(-8),ret,m})},s=>{window.st=(window.st||[]).concat(s)});
  R.connect();await new Promise(r=>setTimeout(r,500));return {state:R.state,base:k.base}},name);
 console.log(await setup(A,"A"));
 // A publishes a retained message before B exists, then a live one after
 await A.pg.evaluate(async()=>{R.publish(K.base+"/t/one",await sealMsg(K.key,{hello:"retained",n:1}),true)});
 await new Promise(r=>setTimeout(r,300));
 console.log(await setup(B,"B"));
 await A.pg.evaluate(async()=>{const big={pad:"x".repeat(30000)};R.publish(K.base+"/t/two",await sealMsg(K.key,big),true)});
 await new Promise(r=>setTimeout(r,500));
 const gotB=await B.pg.evaluate(()=>window.got.map(g=>({t:g.t,ret:g.ret,keys:g.m&&Object.keys(g.m),len:g.m&&g.m.pad&&g.m.pad.length})));
 console.log("B received:",JSON.stringify(gotB));
 // a stranger with the wrong code sees nothing readable
 const wrong=await B.pg.evaluate(async()=>{const k=await gameKeys("WRONG1");const bytes=await sealMsg(K.key,{x:1});return await openMsg(k.key,bytes)});
 console.log("wrong key opens to:",wrong);
 // drop and reconnect: queued publish goes out after reconnect
 await A.pg.evaluate(()=>{R.ws.close()});await new Promise(r=>setTimeout(r,100));
 await A.pg.evaluate(async()=>{R.publish(K.base+"/t/three",await sealMsg(K.key,{after:"reconnect"}),true)});
 await new Promise(r=>setTimeout(r,2500));
 console.log("A states:",await A.pg.evaluate(()=>window.st.join(">")),"B got three:",await B.pg.evaluate(()=>window.got.some(g=>g.m&&g.m.after)));
 console.log("errors",A.errs,B.errs);
 await b.close()})();
