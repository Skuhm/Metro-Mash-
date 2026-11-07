const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();
 for(const city of ["la","sea"]){const P=await phone(b,{mode:"home",city},{clock:false});
  console.log(await P.pg.evaluate(()=>{const E=CITY.ends;const D=id=>dist(id);
   const pair=E.map(a=>E.map(b=>Math.round(D(a)[b]||0)).join(" ")).join("\n");
   // best sixth for LA: maximise the smallest travel time to the first five
   const five=E.slice(0,5);const cand=STATIONS.map(s=>[s.id,Math.min(...five.map(e=>D(e)[s.id]||0))]).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]+":"+Math.round(x[1])).join(" ");
   return CITY.id+" ends "+E.join(",")+"\n"+pair+"\nbest sixth: "+cand}));
  await P.ctx.close()}
 await b.close()})();
