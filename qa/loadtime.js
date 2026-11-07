const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 for(const app of [{mode:"home",city:"la"},{mode:"home",city:"sea"},{mode:"classic",city:"la"}]){
  const ctx=await b.newContext({viewport:{width:390,height:780}});const pg=await ctx.newPage();
  await pg.addInitScript(a=>localStorage.setItem('turf.app',JSON.stringify(a)),app);
  await pg.goto('file://'+process.cwd()+'/dist/turf.html');await pg.waitForTimeout(500);
  const t=await pg.evaluate(()=>{const n=performance.getEntriesByType("navigation")[0];return {domInteractive:Math.round(n.domInteractive),domComplete:Math.round(n.domComplete),loadEnd:Math.round(n.loadEventEnd)}});
  // also time a home render
  const r=await pg.evaluate(()=>{if(MODE!=="home")return null;const t0=performance.now();homeRender();return Math.round(performance.now()-t0)});
  console.log(JSON.stringify(app),JSON.stringify(t),"homeRender ms:",r);await ctx.close()}
 await b.close()})();
