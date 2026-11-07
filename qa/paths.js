const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();const P=await phone(b,{mode:"home",city:"la"},{clock:false});
 console.log(await P.pg.evaluate(()=>{const o=[];for(const c of ["la","sea"]){loadCity(c);for(const [k,ids] of Object.entries(LINE_PATHS))o.push(c+" "+k+" ("+CITY.lines[k].name+"): "+ids.map(id=>ST[id].n).join(" > "));
  const lineOf={};for(const [k,ids] of Object.entries(LINE_PATHS))for(const id of ids)(lineOf[id]=lineOf[id]||new Set()).add(k);
  o.push(c+" single-line stations: "+Object.entries(lineOf).filter(([id,s])=>s.size===1).length+" hubs: "+STATIONS.filter(s=>s.p===4).map(s=>s.n).join(", "))}return o.join("\n")}));
 await b.close()})();
