const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();const P=await phone(b,{mode:"home",city:"sea"},{clock:false});
 console.log(await P.pg.evaluate(()=>{const o=[];o.push("sea S11: "+CARD.S11.d.slice(0,40)+" | S6 list: "+CARD.S6.list[0]+" | S5: "+CARD.S5.d.slice(0,45));
  loadCity("la");o.push("la  S11: "+CARD.S11.d.slice(0,40)+" | S6 list: "+(CARD.S6.list?CARD.S6.list[0]:"(none)")+" | S5: "+CARD.S5.d.slice(0,45));
  loadCity("sea");o.push("sea S11: "+CARD.S11.d.slice(0,40));
  // any card whose text is just its own id is a leftover placeholder
  for(const city of ["la","sea"]){loadCity(city);for(const c of CARDS)for(const k of ["d","c","t"])if(c[k]===c.id)o.push("PLACEHOLDER "+city+" "+c.id+"."+k)}
  return o.join("\n")}));
 if(P.errs.length)console.log(P.errs);await b.close()})();
