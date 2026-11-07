const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();
 for(const app of [{mode:"home",city:"la"},{mode:"classic",city:"la"},{mode:"classic",city:"sea"}]){const {pg,errs,ctx}=await phone(b,app);const html=await pg.evaluate(()=>document.querySelector('#main').innerHTML.slice(0,120));console.log(app.mode,app.city,errs.slice(0,3),html);await ctx.close()}
 await b.close()})();
