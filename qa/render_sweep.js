// render the map nav from every station with every neighbour selected, both modes: any thrown error fails
const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();let bad=0;
 for(const city of ["la","sea"]){const H=await phone(b,{mode:"teams",city,intent:"local"},{clock:false});const pg=H.pg;
  await act(pg,'[data-act=t-create]');await pg.waitForTimeout(300);await pg.evaluate(()=>{if(xp)xpClose()});
  const r=await pg.evaluate(()=>{const errs=[];for(const s of STATIONS){const T=me();T.cur=s.id;T.boards=1;for(const n of ADJ[s.id].concat([null])){TM.sel=n;try{tRender()}catch(e){errs.push(s.id+">"+n+": "+e.message)}}}return errs});
  console.log(city,"teams nav errors:",r.length,r.slice(0,3));bad+=r.length;await H.ctx.close()}
 console.log(bad?"FAIL":"PASS","render sweep");await b.close()})();
