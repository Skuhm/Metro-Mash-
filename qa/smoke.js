const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const out=[];
 // home
 {const {pg,errs,ctx}=await phone(b,{mode:"home",city:"la"});await pg.screenshot({path:'qa/home.png'});out.push(['home',errs]);await ctx.close()}
 for(const city of ["la","sea"]){
  const {pg,errs,ctx}=await phone(b,{mode:"classic",city});
  await pg.fill('#n1','R');await pg.fill('#n2','J');await act(pg,'[data-act=start]');await pg.waitForTimeout(300);
  await pg.screenshot({path:`qa/${city}_xp.png`});
  await act(pg,'[data-act=xpclose]');await pg.waitForTimeout(400);
  await pg.screenshot({path:`qa/${city}_map0.png`});
  const st=await pg.evaluate(()=>({start:START_ID,stations:STATIONS.length,edges:EDGES.length,locks:LOCK_IDS.length,maj:MAJ.map(m=>m.n+":"+m.ids.length),rail:RAIL_MODES.join(","),adjStart:ADJ[START_ID]}));
  out.push([city,st,errs]);await ctx.close();
 }
 console.log(JSON.stringify(out,null,1));await b.close()})();
