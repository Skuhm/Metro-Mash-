const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();const P=await phone(b,{mode:"home",city:"la"},{clock:false});
 console.log(await P.pg.evaluate(()=>{const o=[];for(const c of ["la","sea"]){loadCity(c);o.push(c+": "+STATIONS.map(s=>s.n).join("; "));o.push(c+" lines: "+Object.values(CITY.lines).map(l=>l.name).join("; "))}return o.join("\n")}));
 await b.close()})();
