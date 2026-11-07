const {chromium,phone}=require('./h.js');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:780}});const pg=await ctx.newPage();
pg.on('pageerror',e=>console.log(e.stack.split('\n').slice(0,4).join('\n')));
await pg.addInitScript(a=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('turf.app',JSON.stringify(a));sessionStorage.setItem('seeded','1')}},{mode:"teams",city:"la",intent:"host"});
await pg.goto('file://'+process.cwd()+'/dist/turf.html');await pg.waitForTimeout(500);await b.close()})();
