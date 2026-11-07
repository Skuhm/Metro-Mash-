const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false});
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.evaluate(()=>{if(xp)xpClose()});
 const r=await H.pg.evaluate(async()=>{
  const sizes=[];
  for(let i=0;i<120;i++){const T=me();
   if(T.sz){T.sz=null;T.layLast=now()}
   if(!T.hop||T.hop.settled){const to=T.fx.wrong?T.fx.wrong.to:ADJ[T.cur][i%ADJ[T.cur].length];tAct(()=>tStartHop(to))}
   const o=me().open;if(o&&!o.lock){o.stakes="safe";o.started=true;try{tAct(()=>tFinish(i%3?"win":"fail","x"))}catch(e){}}
   if(me().hop&&!me().hop.arrived)tAct(()=>tArrive());
   const T2=me();if(T2.open&&T2.open.lock){T2.open.started=true;try{tAct(()=>tFinish("fail","x"))}catch(e){}}
   if(T2.hop&&!T2.hop.settled){tAct(()=>{T2.hop.settled=true})}
   if(i%20===19)sizes.push(i+1+" hops: "+JSON.stringify(me()).length+" bytes (log "+JSON.stringify(me().log).length+", ev "+JSON.stringify(me().ev).length+", seen "+JSON.stringify(me().seen).length+", pile "+JSON.stringify(me().pile).length+")");
  }
  return sizes});
 console.log(r.join("\n"));await b.close()})();
