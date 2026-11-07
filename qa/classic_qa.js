// classic mode, both cities: card legality on every hop, every station taps itself, a short scripted day
const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 for(const city of ["la","sea"]){
  const {pg,errs,ctx}=await phone(b,{mode:"classic",city});
  await pg.fill('#n1','R');await pg.fill('#n2','J');await act(pg,'[data-act=start]');await act(pg,'[data-act=xpclose]');await pg.waitForTimeout(200);
  const dead=await pg.evaluate(()=>{const out=[];
   for(const board of ["empty","p1only","theirs"])for(const from of STATIONS)for(const to of ADJ[from.id])for(const c of CARDS){
    S.st=Object.fromEntries(STATIONS.map(s=>[s.id,{o:null,vis:false,failedBy:null,last:0,gild:false,opened:false}]));
    if(board==="p1only")S.st[START_ID].o=1;if(board==="theirs")S.st[to].o=1;
    S.up=0;S.cur=from.id;S.hop={to,from:from.id,up:0,at:Date.now(),arrived:false,settled:false,first:null,card:c.id,lock:false};S.open=[null,null];S.fx=[blankFx(),blankFx()];
    if(unplayable(0,c.id))continue;
    S.open[0]={id:c.id,p:0,lock:false,drawnAt:Date.now(),drawStops:0,stakes:c.fam==="Gambit"?"gambit":"safe",started:false,tally:0,strikes:0,list:[],declared:c.declare?c.declare[0]:null,est:5,stunt:"S8",target:(()=>{const d=dist(from.id);const t=STATIONS.find(x=>(d[x.id]||0)>=18);return t&&t.id})(),deadline:Date.now()+3600000};
    const n1=canStart(S.open[0]).ok;S.hop.arrived=true;S.cur=to;const n2=canStart(S.open[0]).ok;
    if(!n1&&!n2)out.push(board+" "+from.id+">"+to+" "+c.id+": "+canStart(S.open[0]).why)}
   return out});
  // reload a fresh game for taps
  await pg.evaluate(()=>{S=fresh();S.players=[{name:"R",cons:""},{name:"J",cons:""}];startGame();tab="map";render()});await pg.waitForTimeout(300);
  const taps=await pg.evaluate(()=>{const out=[];for(const s of STATIONS){const g=document.querySelector(`#main g.st[data-id="${s.id}"]`);if(!g){out.push(s.id+" missing");continue}
   for(const part of ["text","polygon,circle,ellipse"]){const el=g.querySelector(part);el.scrollIntoView({block:"center",inline:"center"});const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);const id=hit&&hit.closest("[data-id]")&&hit.closest("[data-id]").dataset.id;if(id!==s.id)out.push(s.n+" ("+(part==="text"?"name":"block")+") hits "+(id||"nothing"))}}return out});
  console.log(city,"dead deals:",dead.length,dead.slice(0,4),"| taps:",taps.length?taps:"all ok","| errors:",errs);
  await ctx.close();
 }
 await b.close()})();
